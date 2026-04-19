const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// --- 1. Follow System ---

// @route   POST /api/social/follow/:vendorId
// @desc    Toggle Follow Vendor
router.post('/follow/:vendorId', auth, async (req, res) => {
    const { vendorId } = req.params;
    const userId = req.user.id;

    if (parseInt(vendorId) === userId) return res.status(400).json({ error: "Cannot follow yourself" });

    try {
        const check = await db.query('SELECT * FROM store_followers WHERE vendor_id = $1 AND user_id = $2', [vendorId, userId]);

        if (check.rows.length > 0) {
            // Unfollow
            await db.query('DELETE FROM store_followers WHERE vendor_id = $1 AND user_id = $2', [vendorId, userId]);
            return res.json({ following: false, message: 'Unfollowed' });
        } else {
            // Follow
            await db.query('INSERT INTO store_followers (vendor_id, user_id) VALUES ($1, $2)', [vendorId, userId]);
            return res.json({ following: true, message: 'Followed' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/social/following
// @desc    Get user's followed stores
router.get('/following', auth, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT vp.store_name, vp.store_logo_url, vp.user_id as vendor_id, u.name as owner_name 
            FROM store_followers sf
            JOIN vendor_profiles vp ON sf.vendor_id = vp.user_id
            JOIN users u ON vp.user_id = u.id
            WHERE sf.user_id = $1
        `, [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/social/followers (Vendor Only)
// @desc    Get followers for the logged-in vendor
router.get('/followers', auth, async (req, res) => {
    try {
        const vendorId = req.user.id;
        const result = await db.query(`
            SELECT u.name, u.email, sf.created_at
            FROM store_followers sf
            JOIN users u ON sf.user_id = u.id
            WHERE sf.vendor_id = $1
            ORDER BY sf.created_at DESC
        `, [vendorId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/social/is-following/:vendorId
// @desc    Check status
router.get('/is-following/:vendorId', auth, async (req, res) => {
    try {
        const check = await db.query('SELECT 1 FROM store_followers WHERE vendor_id = $1 AND user_id = $2', [req.params.vendorId, req.user.id]);
        res.json({ following: check.rows.length > 0 });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// --- 2. Wishlist System ---

// @route   POST /api/social/wishlist/:productId
// @desc    Toggle Wishlist
router.post('/wishlist/:productId', auth, async (req, res) => {
    const { productId } = req.params;
    const userId = req.user.id;

    try {
        const check = await db.query('SELECT * FROM wishlists WHERE product_id = $1 AND user_id = $2', [productId, userId]);

        if (check.rows.length > 0) {
            // Remove
            await db.query('DELETE FROM wishlists WHERE product_id = $1 AND user_id = $2', [productId, userId]);
            return res.json({ inWishlist: false, message: 'Removed from wishlist' });
        } else {
            // Add
            await db.query('INSERT INTO wishlists (product_id, user_id) VALUES ($1, $2)', [productId, userId]);
            return res.json({ inWishlist: true, message: 'Added to wishlist' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/social/wishlist
// @desc    Get user's wishlist
router.get('/wishlist', auth, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.*, w.created_at as added_at
            FROM wishlists w
            JOIN products p ON w.product_id = p.id
            WHERE w.user_id = $1
            ORDER BY w.created_at DESC
        `, [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/social/in-wishlist/:productId
// @desc    Check status
router.get('/in-wishlist/:productId', auth, async (req, res) => {
    try {
        const check = await db.query('SELECT 1 FROM wishlists WHERE product_id = $1 AND user_id = $2', [req.params.productId, req.user.id]);
        res.json({ inWishlist: check.rows.length > 0 });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
