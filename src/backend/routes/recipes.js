const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/recipes/:recipeId', (req, res) => {
    try {
        const { recipeId } = req.params;

        const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(recipeId);
        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        const ingredients = db.prepare(
            `SELECT i.id, i.name, i.category, i.calories, ri.quantity, ri.unit
             FROM recipe_ingredients ri
             JOIN ingredients i ON i.id = ri.ingredient_id
             WHERE ri.recipe_id = ?`
        ).all(recipeId);

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

module.exports = router;
