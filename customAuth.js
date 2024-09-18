const { Pool } = require("pg");  // PostgreSQL connection pool
const bcrypt = require("bcrypt");
const config = require('./config');

// Number of rounds to generate salt for hashing
const SALT_ROUNDS = 10;

// Static salt from config
const STATIC_SALT = config.security.salt || 'default_salt_value';  // Ensure static salt exists

// Check if PostgreSQL configuration is set
if (!config.db.host || !config.db.user || !config.db.password || !config.db.database) {
    console.error("Error: Database configuration values are not set.");
    process.exit(1);
}

// Initialize PostgreSQL connection pool with configuration values
const pool = new Pool({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    max: 10,  // Set the maximum number of clients in the pool
    idleTimeoutMillis: 30000,  // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000,  // Return an error after 2 seconds if connection can't be established
});

/**
 * Hashes a plain text password using bcrypt with a static salt.
 * @param {string} plainString - The plain text password to hash.
 * @returns {Promise<string>} - The hashed password.
 */
async function hashPassword(plainString) {
    try {
        // Concatenate the static salt with the plain text password
        const saltedPassword = plainString + STATIC_SALT;
        const salt = await bcrypt.genSalt(SALT_ROUNDS);  // Generate bcrypt salt
        return await bcrypt.hash(saltedPassword, salt);  // Hash the salted password
    } catch (error) {
        console.error("Error hashing password:", error.stack);
        throw error;
    }
}

/**
 * Compares a plain text password with a hashed password using bcrypt and static salt.
 * @param {string} plainString - The plain text password.
 * @param {string} hash - The hashed password from the database.
 * @returns {Promise<boolean>} - True if the password matches, false otherwise.
 */
async function comparePassword(plainString, hash) {
    try {
        // Concatenate the static salt with the plain text password before comparison
        const saltedPassword = plainString + STATIC_SALT;
        return await bcrypt.compare(saltedPassword, hash);
    } catch (error) {
        console.error("Error comparing password:", error.stack);
        throw error;
    }
}

/**
 * Logs errors to a log file or external service.
 * @param {Error} error - The error object.
 * @param {string} message - Additional error message context.
 */
function logError(error, message) {
    // Extend this function to log to a file, an external service, or monitoring system
    console.error(`${message}:`, error.stack);
}

module.exports = {
    type: "credentials",

    /**
     * Fetches user details from the database.
     * @param {string} username - The username to search for.
     * @returns {Promise<object|null>} - Returns a user object with username and permissions, or null if not found.
     */
    users: async function (username) {
        try {
            // Use a connection from the pool to query the database
            const res = await pool.query(
                `SELECT username, permissions FROM nodered_users WHERE username=$1`,
                [username]
            );

            if (res.rows.length > 0) {
                const user = res.rows[0];
                return { username: user.username, permissions: user.permissions };
            } else {
                return null;
            }
        } catch (error) {
            logError(error, "Error fetching user details");
            return null;  // Return null if an error occurs
        }
    },

    /**
     * Authenticates a user by checking the provided password.
     * @param {string} username - The username to authenticate.
     * @param {string} password - The plain-text password to check.
     * @returns {Promise<object|null>} - Returns a user object with username and permissions if authentication is successful, or null otherwise.
     */
    authenticate: async function (username, password) {
        try {
            // Query the database to check if the user exists
            let res = await pool.query(
                `SELECT * FROM nodered_users WHERE username=$1`,
                [username]
            );

            if (res.rows.length > 0) {
                const user = res.rows[0];

                if (!user.password) {
                    // If the user exists but doesn't have a password, hash and set the password
                    const hashedPassword = await hashPassword(password);
                    await pool.query(
                        `UPDATE nodered_users SET password=$1 WHERE username=$2`,
                        [hashedPassword, username]
                    );

                    // Fetch the user with the updated password
                    res = await pool.query(`SELECT * FROM nodered_users WHERE username=$1`, [username]);
                    if (res.rows.length > 0) {
                        const updatedUser = res.rows[0];
                        return { username: updatedUser.username, permissions: updatedUser.permissions };
                    } else {
                        return null;
                    }
                } else {
                    // If the user has a password, compare the salted password with the hash
                    const isPasswordValid = await comparePassword(password, user.password);
                    if (isPasswordValid) {
                        return { username: user.username, permissions: user.permissions };
                    } else {
                        return null;  // Password does not match
                    }
                }
            } else {
                return null;  // User does not exist
            }
        } catch (error) {
            logError(error, "Error during authentication");
            return null;  // Return null in case of an error
        }
    },
};
