// config.js - Configuration file for your server

module.exports = {
    // Database configuration
    dbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/todo-app',

    // Server configuration
    port: process.env.PORT || 5000,

    // JWT configuration
    secretKey: process.env.JWT_SECRET || 'your-secret-key-should-be-long-and-secure',
    tokenExpiry: '7d',

    // Upload configuration
    uploadDir: 'uploads',
    maxFileSize: 5 * 1024 * 1024, // 5MB

    // Allowed file types
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif'],

    // CORS configuration
    corsOptions: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }
};