const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

router.post('/feedback', verifyToken, (req, res) => {
    try {
        const { recipe_id, rating, comment } = req.body;
        const userId = req.user.userId;

        if (!recipe_id || !rating) {
            return res.status(400).json({ error: 'recipe_id and rating are required' });
        }
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'rating must be between 1 and 5' });
        }

        const recipe = db.prepare('SELECT id FROM recipes WHERE id = ?').get(recipe_id);
        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        const result = db.prepare(
            `INSERT INTO feedback (user_id, recipe_id, rating, comment)
             VALUES (?, ?, ?, ?)`
        ).run(userId, recipe_id, rating, comment ?? null);

        res.json({ id: Number(result.lastInsertRowid), message: 'Feedback submitted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/feedback/:recipeId', (req, res) => {
    try {
        const { recipeId } = req.params;

        const rows = db.prepare(
            `SELECT f.id, f.rating, f.comment, f.created_at, u.username
             FROM feedback f
             JOIN users u ON u.id = f.user_id
             WHERE f.recipe_id = ?
             ORDER BY f.created_at DESC`
        ).all(recipeId);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/feedback/:id', verifyToken, (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const feedback = db.prepare('SELECT * FROM feedback WHERE id = ?').get(id);
        if (!feedback) {
            return res.status(404).json({ error: 'Feedback not found' });
        }
        if (feedback.user_id !== userId) {
            return res.status(403).json({ error: 'Not authorized to delete this feedback' });
        }

        db.prepare('DELETE FROM feedback WHERE id = ?').run(id);
        res.json({ message: 'Feedback deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
