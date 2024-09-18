const config = {
    db: {
        host: '{HOST}',
        user: '{USER}',
        password: '{PASSOWRD}',
        database: '{DB}',
    },
    security: {
        salt: '{STATIC_SALT}',  // Add your static salt here, e.g., 'a_random_generated_salt'
    },
};

module.exports = config;
