const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

router.get('/history/:userId', verifyToken, (req, res) => {
    try {
        const { userId } = req.params;
        const tokenUserId = req.user.userId;

        if (String(tokenUserId) !== String(userId)) {
            return res.status(403).json({ error: 'User ID mismatch' });
        }

        const rows = db.prepare(
            `SELECT rh.recommend_date, rh.recipe_id, rh.is_adopted, rh.actual_date, r.name AS recipe_name
             FROM recommend_history rh
             JOIN recipes r ON r.id = rh.recipe_id
             WHERE rh.user_id = ?
             ORDER BY rh.recommend_date DESC, rh.id DESC`
        ).all(userId);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;