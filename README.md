# NodeRED-PostgreSQL-AdminAuth

This repository contains a custom admin authentication implementation for [Node-RED](https://nodered.org/) using PostgreSQL and AES encryption.

## Prerequisites
- Node.js installed
- Node-RED installed
- PostgreSQL database setup
- Basic knowledge of Node-RED configuration and PostgreSQL

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Kowts/NodeRED-PostgreSQL-AdminAuth.git
cd NodeRED-PostgreSQL-AdminAuth
```

2. Install required Node.js modules:
```bash
npm install pg crypto
```

3. Configure the PostgreSQL database:
- Create a PostgreSQL database (e.g., `automationhub`) and a table `nodered_users` with the following schema:
```sql
CREATE TABLE nodered_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    permissions TEXT NOT NULL,
    status INT DEFAULT 1 NOT NULL
);
```

4. Update `config.js` with your PostgreSQL connection details and encryption settings:
```javascript
const config = {
    db: {
        host: 'localhost',
        user: 'postgres',
        password: 'your_db_password',
        database: 'automationhub',
    },
    encryption: {
        secret: 'your_encryption_secret',
        iv: 'your_encryption_iv',
    },
};
module.exports = config;
```

5. Modify your Node-RED settings file (~/.node-red/settings.js):
- Require the custom authentication module:
```javascript

const customAuth = require("./path/to/customAuth");

module.exports = {
    // other settings...
    adminAuth: customAuth
};
```

6. Start Node-RED:
```bash
node-red
```

## How It Works
- The customAuth.js file contains logic that authenticates users against a PostgreSQL database. It encrypts passwords using AES-256-CBC encryption.
- If a user exists without a password, the system will store the encrypted password in the database for future logins.

## Usage
- Add users to the nodered_users table in PostgreSQL.
- The permissions field determines access level ("read" or "readwrite").

### Generating Secret Key and Initialization Vector (IV)
- To generate these values, execute the code below:
```javascript
const crypto = require("crypto");

// Generate a 32-byte secret key (256 bits)
const secret = crypto.randomBytes(32).toString("hex");

// Generate a 16-byte initialization vector (128 bits)
const iv = crypto.randomBytes(16).toString("hex");

console.log("Secret Key:", secret);
console.log("IV:", iv);
```

## License
This project is licensed under the MIT License.
