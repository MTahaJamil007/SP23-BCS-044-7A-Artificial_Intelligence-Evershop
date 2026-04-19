const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const path = require('path');

// Configure Multer for image upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Append extension
    }
});

const upload = multer({ storage: storage });

// @route   GET /api/products
// @desc    Get all products
router.get('/', async (req, res) => {
    try {
        // Join with users to get vendor name
        const result = await db.query(`
            SELECT p.*, u.name as vendor_name 
            FROM products p 
            JOIN users u ON p.vendor_id = u.id 
            ORDER BY p.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/products/:id
// @desc    Get single product by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(`
            SELECT p.*, u.name as vendor_name 
            FROM products p 
            JOIN users u ON p.vendor_id = u.id 
            WHERE p.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/products
// @desc    Create a product (Vendor only)
router.post('/', upload.single('image'), async (req, res) => {
    // We need to parse fields. Multer handles multi-part form data.
    const { name, price, stock_quantity, description, category, colors, sizes, specs } = req.body;

    try {
        const jwt = require('jsonwebtoken');
        let vendor_id;
        if (req.headers.authorization) {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            vendor_id = decoded.id;
        }

        if (!vendor_id) {
            return res.status(401).json({ error: 'Unauthorized: No token' });
        }

        const imageUrl = req.file ? req.file.path.replace(/\\/g, "/") : null;

        // Parse JSON fields if they come as strings (Multipart form data often sends arrays/objects as strings)
        let parsedColors = colors ? (typeof colors === 'string' ? JSON.parse(colors) : colors) : [];
        let parsedSizes = sizes ? (typeof sizes === 'string' ? JSON.parse(sizes) : sizes) : [];
        let parsedSpecs = specs ? (typeof specs === 'string' ? JSON.parse(specs) : specs) : [];

        const result = await db.query(
            'INSERT INTO products (vendor_id, name, description, price, stock_quantity, image_url, category, colors, sizes, specs) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [vendor_id, name, description, price, stock_quantity, imageUrl, category, parsedColors, parsedSizes, JSON.stringify(parsedSpecs)]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// @route   PUT /api/products/:id
// @desc    Update product (Stock, Price, etc.)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { stock_quantity, price, status } = req.body; // status is visual only for now if column missing

    try {
        // Simple update
        const result = await db.query(
            'UPDATE products SET stock_quantity = $1, price = $2 WHERE id = $3 RETURNING *',
            [stock_quantity, price, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// @route   DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM products WHERE id = $1', [id]);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
