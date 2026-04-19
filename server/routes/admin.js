const express = require('express');
const router = express.Router();
const db = require('../config/db');

// @route   GET /api/admin/vendors
// @desc    Get all vendors (or pending ones)
router.get('/vendors', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, name, email, role, is_approved, created_at FROM users WHERE role = $1 ORDER BY created_at DESC',
            ['Vendor']
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PUT /api/admin/approve-vendor/:id
// @desc    Approve a vendor
router.put('/approve-vendor/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'UPDATE users SET is_approved = TRUE WHERE id = $1 AND role = $2 RETURNING *',
            [id, 'Vendor']
        );

        // Simulate Email
        console.log(`[EMAIL-SERVICE] Sending Approval Email to ${result.rows[0].email}: "Congratulations! Your vendor account has been approved. Start selling now!"`);

        res.json({ message: 'Vendor approved', vendor: result.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   DELETE /api/admin/reject-vendor/:id
// @desc    Reject (Delete) a vendor applicant
router.delete('/reject-vendor/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Only delete if NOT approved (security check)
        const check = await db.query('SELECT is_approved FROM users WHERE id = $1', [id]);
        if (check.rows.length > 0 && check.rows[0].is_approved) {
            return res.status(400).json({ error: 'Cannot delete an already approved vendor' });
        }

        await db.query('DELETE FROM users WHERE id = $1 AND role = $2', [id, 'Vendor']);
        res.json({ message: 'Vendor rejected and removed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/admin/categories
router.get('/categories', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM categories ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/admin/categories
router.post('/categories', async (req, res) => {
    const { name, parent_id } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO categories (name, parent_id) VALUES ($1, $2) RETURNING *',
            [name, parent_id || null]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   DELETE /api/admin/categories/:id
router.delete('/categories/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
        res.json({ message: 'Category deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/admin/settings
router.get('/settings', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM system_settings');
        // Convert array to object { key: value }
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   PUT /api/admin/settings
router.put('/settings', async (req, res) => {
    const { key, value } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO system_settings (key, value) 
             VALUES ($1, $2) 
             ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP 
             RETURNING *`,
            [key, value]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
