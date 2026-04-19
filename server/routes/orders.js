const express = require('express');
const router = express.Router();
const db = require('../config/db');

// @route   GET /api/orders/user
// @desc    Get logged-in user's orders (with items)
router.get('/user', async (req, res) => {
    const { userId } = req.query;

    if (!userId) return res.status(401).json({ error: 'User ID required' });

    try {
        // Use JSON_AGG to get items, handle nulls if no items exist (shouldn't happen for valid orders but safety first)
        const result = await db.query(`
            SELECT o.id, o.created_at, o.total_amount, o.status,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'product_id', p.id,
                            'name', p.name,
                            'price', oi.price_at_purchase,
                            'quantity', oi.quantity,
                            'image_url', p.image_url
                        )
                    ) FILTER (WHERE oi.id IS NOT NULL), 
                    '[]'
                ) as items
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.customer_id = $1
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `, [userId]);

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching user orders:", err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/orders
router.post('/', async (req, res) => {
    const { userId, cartItems } = req.body;

    if (!userId || !cartItems || cartItems.length === 0) {
        return res.status(400).json({ error: 'Invalid order data' });
    }

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        let totalAmount = 0;
        const processedItems = [];
        const vendorGroups = {}; // { vendorId: { total: 0, items: [] } }

        // 1. Validation & Grouping
        for (const item of cartItems) {
            const productRes = await client.query('SELECT id, price, stock_quantity, vendor_id FROM products WHERE id = $1', [item.id]);
            if (productRes.rows.length === 0) throw new Error(`Product ${item.id} not found`);
            const product = productRes.rows[0];

            if (product.stock_quantity < item.quantity) throw new Error(`Insufficient stock for product ${product.id}`);

            const itemTotal = parseFloat(product.price) * item.quantity;
            totalAmount += itemTotal;

            // Prepare item data
            const itemData = {
                product_id: product.id,
                vendor_id: product.vendor_id,
                price: parseFloat(product.price),
                quantity: item.quantity
            };
            processedItems.push(itemData);

            // Group by Vendor for Sub-Orders
            if (!vendorGroups[product.vendor_id]) {
                vendorGroups[product.vendor_id] = { total: 0, items: [] };
            }
            vendorGroups[product.vendor_id].total += itemTotal;
            vendorGroups[product.vendor_id].items.push(itemData);
        }

        // 2. Create Parent Order
        const orderRes = await client.query(
            'INSERT INTO orders (customer_id, total_amount, status) VALUES ($1, $2, $3) RETURNING id',
            [userId, totalAmount, 'Processing']
        );
        const orderId = orderRes.rows[0].id;

        // 3. Create Sub-Orders & Insert Items
        for (const [vendorId, group] of Object.entries(vendorGroups)) {
            // Create Sub-Order
            const subOrderRes = await client.query(
                'INSERT INTO sub_orders (order_id, vendor_id, sub_total, status) VALUES ($1, $2, $3, $4) RETURNING id',
                [orderId, vendorId, group.total, 'Processing']
            );
            const subOrderId = subOrderRes.rows[0].id;

            // Insert Items linked to Sub-Order
            for (const item of group.items) {
                await client.query(
                    'INSERT INTO order_items (order_id, sub_order_id, product_id, vendor_id, quantity, price_at_purchase) VALUES ($1, $2, $3, $4, $5, $6)',
                    [orderId, subOrderId, item.product_id, item.vendor_id, item.quantity, item.price]
                );

                // Decrement Stock
                await client.query(
                    'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
                    [item.quantity, item.product_id]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Order created successfully', orderId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Order Transaction Error:', err.message);
        res.status(500).json({ error: 'Transaction failed: ' + err.message });
    } finally {
        client.release();
    }
});

// @route   PUT /api/orders/:id/status
// @desc    Update status (Now updates SUB-ORDER status for Vendors)
// @note    For Admins, we might want to update Parent Order, but for now strict Phase 3 focuses on Vendor flow.
//          We assume the ID passed here is the SUB_ORDER_ID if called from Vendor Dashboard.
//          Wait, Vendor Dashboard shows list of "Orders". I need to update vendor.js to fetch SubOrders explicitly.
//          I will keep this as a generic update, but I'll add a specific route for sub-orders.

// Generic Sub-Order Status Update (Vendor)
router.put('/sub-orders/:id/status', async (req, res) => {
    const { id } = req.params; // sub_order_id
    const { status } = req.body;

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Update Sub-Order Status
        const subRes = await client.query(
            'UPDATE sub_orders SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        const subOrder = subRes.rows[0];

        // 2. Fetch all Sibling Sub-Orders for the Parent Order
        const parentId = subOrder.order_id;
        const siblingsRes = await client.query(
            'SELECT status FROM sub_orders WHERE order_id = $1',
            [parentId]
        );
        const siblings = siblingsRes.rows;

        // 3. Determine Parent Status
        let newParentStatus = 'Processing';
        const allShipped = siblings.every(s => s.status === 'Shipped' || s.status === 'Delivered');
        const allDelivered = siblings.every(s => s.status === 'Delivered');
        const anyShipped = siblings.some(s => s.status === 'Shipped' || s.status === 'Delivered');
        const allCancelled = siblings.every(s => s.status === 'Cancelled');

        if (allDelivered) {
            newParentStatus = 'Delivered';
        } else if (allShipped) {
            newParentStatus = 'Shipped';
        } else if (anyShipped) {
            newParentStatus = 'Partially Shipped';
        } else if (allCancelled) {
            newParentStatus = 'Cancelled';
        }

        // 4. Update Parent Order
        await client.query(
            'UPDATE orders SET status = $1 WHERE id = $2',
            [newParentStatus, parentId]
        );

        await client.query('COMMIT');
        res.json(subOrder);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

module.exports = router;
