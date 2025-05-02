// config.js - Configuration file for your server
require('dotenv').config();

module.exports = {
    // Database configuration
    dbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/todo-app',

    // Server configuration
    port: process.env.PORT || 5000,

    // JWT configuration
    secretKey: process.env.JWT_SECRET || 'your-secret-key-should-be-long-and-secure',
    tokenExpiry: process.env.TOKEN_EXPIRY || '7d',

    // Upload configuration
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024, // 5MB

    // Allowed file types
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif'],

    // CORS configuration
    corsOptions: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }
};