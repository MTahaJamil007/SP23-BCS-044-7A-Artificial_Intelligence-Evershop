const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123');
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid Token' });
    }
};

const isVendor = (req, res, next) => {
    if (req.user && (req.user.role === 'Vendor' || req.user.role === 'Administrator')) {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Vendors only.' });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'Administrator') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Admins only.' });
    }
};

module.exports = { verifyToken, isVendor, isAdmin };
