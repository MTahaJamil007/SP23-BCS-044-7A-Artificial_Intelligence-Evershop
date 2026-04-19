const express = require('express');
const router = express.Router();
const db = require('../config/db');

// @route   GET /api/storefront/:vendorId
// @desc    Get public vendor profile and products
router.get('/:vendorId', async (req, res) => {
    const { vendorId } = req.params;

    try {
        // 1. Get Vendor Profile
        let profileRes = await db.query(`
            SELECT vp.*, u.name as owner_name, u.email
            FROM vendor_profiles vp
            JOIN users u ON vp.user_id = u.id
            WHERE vp.user_id = $1
        `, [vendorId]);

        let profile;

        if (profileRes.rows.length === 0) {
            // Fallback: Check if user exists at all
            const userRes = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [vendorId]);

            if (userRes.rows.length === 0) {
                return res.status(404).json({ error: 'Vendor not found' });
            }

            // Create a default/temporary profile object from user data
            const user = userRes.rows[0];
            profile = {
                user_id: user.id,
                store_name: user.name + "'s Store",
                owner_name: user.name,
                email: user.email,
                store_logo_url: null,
                store_banner_url: null,
                store_description: `Welcome to ${user.name}'s exclusive collection.`
            };
        } else {
            profile = profileRes.rows[0];
        }

        // 2. Get Vendor Products
        const productsRes = await db.query(`
            SELECT * FROM products 
            WHERE vendor_id = $1 
            ORDER BY created_at DESC
        `, [vendorId]);

        // 3. Get Stats (Aggregated from Reviews)
        // Count reviews for products belonging to this vendor
        const statsRes = await db.query(`
            SELECT COUNT(r.id) as review_count, AVG(r.rating) as avg_rating
            FROM reviews r
            JOIN products p ON r.product_id = p.id
            WHERE p.vendor_id = $1
        `, [vendorId]);

        const stats = statsRes.rows[0];

        res.json({
            profile: {
                ...profile,
                name: profile.store_name || profile.owner_name, // Fallback
                stats: {
                    rating: Number(stats.avg_rating || 5).toFixed(1), // Default to 5 if new
                    reviewCount: Number(stats.review_count || 0),
                    itemsSold: 100 + Number(stats.review_count) * 5 // Mock 'sold' logic based on reviews or random
                }
            },
            products: productsRes.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
