const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

router.get('/user/:userId/preferences', verifyToken, (req, res) => {
    try {
        const { userId } = req.params;

        if (Number(req.user.userId) !== Number(userId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const tastePreferences = db.prepare(
            'SELECT preference_type, preference_content FROM taste_preferences WHERE user_id = ?'
        ).all(userId);

        const dietaryRestrictions = db.prepare(
            'SELECT restriction_type, restriction_content FROM dietary_restrictions WHERE user_id = ?'
        ).all(userId);

        res.json({ taste_preferences: tastePreferences, dietary_restrictions: dietaryRestrictions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/user/:userId/preferences', verifyToken, (req, res) => {
    try {
        const { userId } = req.params;
        const { taste_preferences, dietary_restrictions } = req.body;

        if (Number(req.user.userId) !== Number(userId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        db.exec('BEGIN');
        try {
            db.prepare('DELETE FROM taste_preferences WHERE user_id = ?').run(userId);
            db.prepare('DELETE FROM dietary_restrictions WHERE user_id = ?').run(userId);

            if (taste_preferences && Array.isArray(taste_preferences)) {
                const insertTaste = db.prepare(
                    'INSERT INTO taste_preferences (user_id, preference_type, preference_content) VALUES (?, ?, ?)'
                );
                for (const t of taste_preferences) {
                    insertTaste.run(userId, t.preference_type, t.preference_content);
                }
            }

            if (dietary_restrictions && Array.isArray(dietary_restrictions)) {
                const insertDiet = db.prepare(
                    'INSERT INTO dietary_restrictions (user_id, restriction_type, restriction_content) VALUES (?, ?, ?)'
                );
                for (const d of dietary_restrictions) {
                    insertDiet.run(userId, d.restriction_type, d.restriction_content);
                }
            }

            db.exec('COMMIT');
        } catch (err) {
            db.exec('ROLLBACK');
            throw err;
        }

        res.json({ message: 'Preferences updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
