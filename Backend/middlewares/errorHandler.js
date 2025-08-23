// middlewares/errorHandler.js

const errorHandler = (err, req, res, next) => {
    console.error('🔥 ERROR:', err.message, err.stack);

    // Firebase authentication errors
    if (err.code && err.code.startsWith('auth/')) {
        return res.status(401).json({ error: 'Authentication error' });
    }

    // Firebase Firestore errors
    if (err.code && err.code.startsWith('firestore/')) {
        return res.status(400).json({ error: 'Database error' });
    }

    // Default error handling
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message || 'Something went wrong!',
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
};

module.exports = errorHandler;
