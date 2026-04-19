const express = require('express');
const router = express.Router();
const db = require('../config/db');

// @route   GET /api/reviews/:productId
// @desc    Get reviews for a product
router.get('/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const result = await db.query(`
            SELECT r.*, u.name as user_name 
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.product_id = $1
            ORDER BY r.created_at DESC
        `, [productId]);

        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/reviews
// @desc    Add a review
router.post('/', async (req, res) => {
    const { userId, productId, rating, comment } = req.body;

    if (!userId || !productId || !rating) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const result = await db.query(
            'INSERT INTO reviews (user_id, product_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, productId, rating, comment]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
