const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// @route   GET /api/vendor/stats
// @desc    Get vendor dashboard stats
router.get('/stats', auth, async (req, res) => {
    try {
        const vendorId = req.user.id;

        // 1. Total Sales
        const salesRes = await db.query(
            'SELECT SUM(price_at_purchase * quantity) as total FROM order_items WHERE vendor_id = $1',
            [vendorId]
        );
        const totalSales = salesRes.rows[0].total || 0;

        // 2. Pending Orders (Count of distinct orders that are processing)
        const pendingRes = await db.query(`
            SELECT COUNT(DISTINCT oi.order_id) as count 
            FROM order_items oi 
            JOIN orders o ON oi.order_id = o.id 
            WHERE oi.vendor_id = $1 AND o.status = 'Processing'`,
            [vendorId]
        );
        const pendingOrders = pendingRes.rows[0].count;

        // 3. Low Stock Alerts
        const stockRes = await db.query(
            'SELECT COUNT(*) as count FROM products WHERE vendor_id = $1 AND stock_quantity < 5',
            [vendorId]
        );
        const lowStock = stockRes.rows[0].count;

        res.json({
            totalSales,
            pendingOrders,
            lowStock
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/vendor/products
// @desc    Get all products for this vendor
router.get('/products', auth, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM products WHERE vendor_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/vendor/orders
// @desc    Get sub-orders for this vendor
router.get('/orders', auth, async (req, res) => {
    try {
        const vendorId = req.user.id;
        const result = await db.query(`
            SELECT so.id, so.created_at, so.status, so.sub_total as vendor_total, u.name as customer_name
            FROM sub_orders so
            JOIN orders o ON so.order_id = o.id
            JOIN users u ON o.customer_id = u.id
            WHERE so.vendor_id = $1
            ORDER BY so.created_at DESC`,
            [vendorId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

const multer = require('multer');
const path = require('path');

// Configure Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// @route   GET /api/vendor/profile
// @desc    Get current vendor profile settings
router.get('/profile', auth, async (req, res) => {
    try {
        const vendorId = req.user.id;
        const result = await db.query('SELECT * FROM vendor_profiles WHERE user_id = $1', [vendorId]);

        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            // Return empty structure if not set
            res.json({
                store_name: '',
                store_description: '',
                store_logo_url: '',
                store_banner_url: ''
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PUT /api/vendor/profile
// @desc    Update vendor profile (Logo, Banner, Text)
router.put('/profile', auth, upload.fields([{ name: 'store_logo', maxCount: 1 }, { name: 'store_banner', maxCount: 1 }]), async (req, res) => {
    const { store_name, store_description } = req.body;
    const vendorId = req.user.id;

    try {
        // Handle Files
        let logoUrl = null;
        if (req.files['store_logo']) {
            logoUrl = req.files['store_logo'][0].path.replace(/\\/g, "/");
        }

        let bannerUrl = null;
        if (req.files['store_banner']) {
            bannerUrl = req.files['store_banner'][0].path.replace(/\\/g, "/");
        }

        // Check if profile exists
        const checkRes = await db.query('SELECT * FROM vendor_profiles WHERE user_id = $1', [vendorId]);

        if (checkRes.rows.length === 0) {
            // Insert
            const insertRes = await db.query(
                `INSERT INTO vendor_profiles (user_id, store_name, store_description, store_logo_url, store_banner_url) 
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [vendorId, store_name, store_description, logoUrl, bannerUrl]
            );
            res.json(insertRes.rows[0]);
        } else {
            // Update (Only update files if they were uploaded)
            const current = checkRes.rows[0];
            const newLogo = logoUrl || current.store_logo_url;
            const newBanner = bannerUrl || current.store_banner_url;

            const updateRes = await db.query(
                `UPDATE vendor_profiles 
                 SET store_name = $1, store_description = $2, store_logo_url = $3, store_banner_url = $4, updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = $5 RETURNING *`,
                [store_name, store_description, newLogo, newBanner, vendorId]
            );
            res.json(updateRes.rows[0]);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

module.exports = router;
