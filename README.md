# NodeRED-DB-AdminAuth

This repository contains a custom admin authentication implementation for [Node-RED](https://nodered.org/) using PostgreSQL and AES encryption.

## Prerequisites
- Node.js installed
- Node-RED installed
- PostgreSQL database setup
- Basic knowledge of Node-RED configuration and PostgreSQL

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/NodeRED-DB-AdminAuth.git
    cd NodeRED-DB-AdminAuth
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
        permissions TEXT
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
