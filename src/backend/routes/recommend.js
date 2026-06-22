const express = require('express');
const router = express.Router();
const db = require('../db');

function calcBmr(user) {
    if (user.gender === 'male') {
        return 10 * user.weight + 6.25 * user.height - 5 * user.age + 5;
    }
    return 10 * user.weight + 6.25 * user.height - 5 * user.age - 161;
}

function getCalorieFactor(activityLevel) {
    const multipliers = { low: 1.2, medium: 1.4, high: 1.6 };
    return multipliers[activityLevel] || 1.2;
}

router.get('/recommend/daily/:userId', (req, res) => {
    try {
        const { userId } = req.params;

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const bmr = calcBmr(user);
        const factor = getCalorieFactor(user.activity_level);
        const targetCalories = Math.round(bmr * factor);
        const calorieMin = Math.round(targetCalories * 0.9);
        const calorieMax = Math.round(targetCalories * 1.1);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const dateStr = sevenDaysAgo.toISOString().split('T')[0];

        const recentRows = db.prepare(
            'SELECT recipe_id FROM recommend_history WHERE user_id = ? AND recommend_date >= ?'
        ).all(userId, dateStr);
        const excluded = new Set(recentRows.map(r => r.recipe_id));

        const allRecipes = db.prepare(
            `SELECT r.*, COALESCE(ROUND(SUM(i.calories * ri.quantity / 100.0), 0), 0) AS total_calories
             FROM recipes r
             LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
             LEFT JOIN ingredients i ON i.id = ri.ingredient_id
             GROUP BY r.id`
        ).all();

        let candidates = allRecipes.filter(r => !excluded.has(r.id));
        if (candidates.length === 0) candidates = allRecipes;

        let selected = [];
        let used = new Set();

        for (let attempt = 0; attempt < 50 && selected.length < 6; attempt++) {
            selected = [];
            used = new Set();
            const shuffled = [...candidates].sort(() => Math.random() - 0.5).slice(0, 20);

            if (shuffled.length === 0) break;
            const first = shuffled.splice(Math.floor(Math.random() * shuffled.length), 1)[0];
            selected.push(first);
            used.add(first.id);

            const remaining = shuffled.sort(() => Math.random() - 0.5);
            for (const recipe of remaining) {
                if (selected.length >= 6) break;
                if (used.has(recipe.id)) continue;
                const currentTotal = selected.reduce((s, r) => s + r.total_calories, 0) + recipe.total_calories;
                if (currentTotal <= calorieMax || selected.length < 5) {
                    selected.push(recipe);
                    used.add(recipe.id);
                }
            }

            if (selected.length < 6) {
                for (const recipe of candidates) {
                    if (selected.length >= 6) break;
                    if (used.has(recipe.id)) continue;
                    selected.push(recipe);
                    used.add(recipe.id);
                }
            }

            const total = selected.reduce((s, r) => s + r.total_calories, 0);
            if (total >= calorieMin && total <= calorieMax) break;
        }

        const totalCalories = Math.round(selected.reduce((s, r) => s + r.total_calories, 0));

        const today = new Date().toISOString().split('T')[0];
        const insertHistory = db.prepare(
            'INSERT INTO recommend_history (user_id, recipe_id, recommend_date) VALUES (?, ?, ?)'
        );
        for (const r of selected) {
            insertHistory.run(userId, r.id, today);
        }

        res.json({
            recommend_date: today,
            summary: `今日推荐总热量约 ${totalCalories} kcal，目标 ${targetCalories} kcal（±10%），预估每日消耗约 ${Math.round(bmr * factor)} kcal`,
            target_calories: targetCalories,
            total_calories: totalCalories,
            recipes: selected.map(r => ({
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

router.get('/recommend/random', (req, res) => {
    try {
        const { cuisine } = req.query;
        let where = '';
        let params = [];
        if (cuisine) {
            where = 'WHERE cuisine = ?';
            params.push(cuisine);
        }

        const recipe = db.prepare(`SELECT * FROM recipes ${where} ORDER BY RANDOM() LIMIT 1`).get(...params);
        if (!recipe) {
            return res.status(404).json({ error: 'No recipe found' });
        }

        const ingredients = db.prepare(
            `SELECT i.id, i.name, i.category, i.calories, ri.quantity, ri.unit
             FROM recipe_ingredients ri
             JOIN ingredients i ON i.id = ri.ingredient_id
             WHERE ri.recipe_id = ?`
        ).all(recipe.id);

        const steps = recipe.steps ? recipe.steps.split('\n').filter(s => s.trim()) : [];

        res.json({
            id: recipe.id,
            name: recipe.name,
            cuisine: recipe.cuisine,
            flavor: recipe.flavor,
            difficulty: recipe.difficulty,
            duration: recipe.duration,
            cost: recipe.cost,
            season: recipe.season,
            steps,
            ingredients
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/recommend/by-ingredients', (req, res) => {
    try {
        const { ingredients } = req.body;
        if (!ingredients || !ingredients.trim()) {
            return res.status(400).json({ error: 'ingredients is required' });
        }

        const list = ingredients.split(',').map(s => s.trim()).filter(Boolean);
        if (list.length === 0) {
            return res.status(400).json({ error: 'At least one ingredient is required' });
        }

        const placeholders = list.map(() => '?').join(',');
        const rows = db.prepare(
            `SELECT DISTINCT r.id, r.name, r.cuisine, r.flavor, r.difficulty, r.duration, r.cost, r.season
             FROM recipes r
             JOIN recipe_ingredients ri ON ri.recipe_id = r.id
             JOIN ingredients i ON i.id = ri.ingredient_id
             WHERE i.name IN (${placeholders})
             ORDER BY r.id`
        ).all(...list);

        res.json({ recipes: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/recommend/history/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const days = parseInt(req.query.days, 10) || 30;

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().split('T')[0];

        const rows = db.prepare(
            `SELECT rh.id, rh.recipe_id, rh.recommend_date, rh.is_adopted, r.name AS recipe_name
             FROM recommend_history rh
             JOIN recipes r ON r.id = rh.recipe_id
             WHERE rh.user_id = ? AND rh.recommend_date >= ?
             ORDER BY rh.recommend_date DESC, rh.id DESC`
        ).all(userId, cutoffStr);

        res.json({ records: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
