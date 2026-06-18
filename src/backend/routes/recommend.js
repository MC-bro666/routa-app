const express = require('express');
const router = express.Router();
const db = require('../db');

function calcCalorieNeeds(user) {
    let bmr;
    if (user.gender === 'male') {
        bmr = 10 * user.weight + 6.25 * user.height - 5 * user.age + 5;
    } else {
        bmr = 10 * user.weight + 6.25 * user.height - 5 * user.age - 161;
    }

    const multipliers = { low: 1.2, medium: 1.55, high: 1.9 };
    const factor = multipliers[user.activity_level] || 1.2;
    return Math.round(bmr * factor);
}

router.get('/recommend/daily/:userId', (req, res) => {
    try {
        const { userId } = req.params;

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const calorieGoal = calcCalorieNeeds(user);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const dateStr = sevenDaysAgo.toISOString().split('T')[0];

        const recentRows = db.prepare(
            'SELECT recipe_id FROM recommend_history WHERE user_id = ? AND recommend_date >= ?'
        ).all(userId, dateStr);

        const recentIds = new Set(recentRows.map(r => r.recipe_id));
        const excluded = new Set(recentIds);
        const recipes = [];

        while (recipes.length < 6) {
            const remaining = 6 - recipes.length;
            let rows;

            if (excluded.size > 0) {
                const placeholders = [...excluded].map(() => '?').join(',');
                rows = db.prepare(
                    `SELECT * FROM recipes WHERE id NOT IN (${placeholders}) ORDER BY RANDOM() LIMIT ?`
                ).all(...excluded, remaining);
            } else {
                rows = db.prepare('SELECT * FROM recipes ORDER BY RANDOM() LIMIT ?').all(remaining);
            }

            if (rows.length === 0) break;

            for (const r of rows) {
                if (!excluded.has(r.id)) {
                    recipes.push(r);
                    excluded.add(r.id);
                }
            }
        }

        const today = new Date().toISOString().split('T')[0];
        const insertHistory = db.prepare(
            'INSERT INTO recommend_history (user_id, recipe_id, recommend_date) VALUES (?, ?, ?)'
        );
        for (const r of recipes) {
            insertHistory.run(userId, r.id, today);
        }

        res.json({
            recommend_date: today,
            recipes: recipes.map(r => ({
                id: r.id,
                name: r.name,
                cuisine: r.cuisine,
                flavor: r.flavor,
                difficulty: r.difficulty,
                duration: r.duration,
                cost: r.cost,
                season: r.season
            }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
