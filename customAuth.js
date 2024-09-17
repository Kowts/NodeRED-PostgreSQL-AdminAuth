const { Pool } = require("pg");  // Use Pool instead of Client
const crypto = require("crypto");
const config = require('./config');

// Check if configuration values for encryption are set correctly
if (!config.encryption.secret || !config.encryption.iv) {
    console.error("Error: SECRET or IV configuration values are not set.");
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

// Convert secret and IV from hex format to Buffer objects
const key = Buffer.from(config.encryption.secret, "hex");
const ivBuffer = Buffer.from(config.encryption.iv, "hex");

/**
 * Encrypts a plain text string using AES-256-CBC encryption.
 * @param {string} plainString - The plain text string to encrypt.
 * @param {Buffer} AesKey - The encryption key.
 * @param {Buffer} AesIV - The initialization vector.
 * @returns {string} - The encrypted string in base64 format.
 */
function encrypt(plainString, AesKey, AesIV) {
    const cipher = crypto.createCipheriv("aes-256-cbc", AesKey, AesIV);
    let encrypted = Buffer.concat([
        cipher.update(Buffer.from(plainString, "utf8")),
        cipher.final(),
    ]);
    return encrypted.toString("base64");
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
            // Use a connection from the pool
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
            console.error("Error fetching user details:", error.stack);
            return null; // Return null if an error occurs
        }
    },

    /**
     * Authenticates a user by checking the provided password.
     * @param {string} username - The username to authenticate.
     * @param {string} password - The password to check.
     * @returns {Promise<object|null>} - Returns a user object with username and permissions if authentication is successful, or null otherwise.
     */
    authenticate: async function (username, password) {
        try {
            // Encrypt the provided password
            const encryptedData = encrypt(password, key, ivBuffer);

            // Query to check if the user exists
            let res = await pool.query(
                `SELECT * FROM nodered_users WHERE username=$1`,
                [username]
            );

            if (res.rows.length > 0) {
                const user = res.rows[0];

                if (!user.password) {
                    // If the user exists but doesn't have a password, set the password
                    await pool.query(
                        `UPDATE nodered_users SET password=$1 WHERE username=$2`,
                        [encryptedData, username]
                    );

                    // Fetch the user with the updated password
                    res = await pool.query(
                        `SELECT * FROM nodered_users WHERE username=$1`,
                        [username]
                    );
                    if (res.rows.length > 0) {
                        const updatedUser = res.rows[0];
                        const userWithPermissions = { username: updatedUser.username, permissions: updatedUser.permissions };
                        return userWithPermissions;
                    } else {
                        return null;
                    }
                } else if (user.password === encryptedData) {
                    // If the password matches, return the user with permissions
                    const userWithPermissions = { username: user.username, permissions: user.permissions };
                    return userWithPermissions;
                } else {
                    return null; // Password does not match
                }
            } else {
                return null; // User does not exist
            }
        } catch (error) {
            console.error("Error executing query:", error.stack);
            return null; // Return null in case of an error
        }
    },
};
