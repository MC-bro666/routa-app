const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3');

// ✅ 直接创建数据库连接
const db = new sqlite3.Database('src/database/recipe.db');

// ============================================================
// GET /api/recommend/daily/:userId - 每日推荐
// ============================================================
router.get('/recommend/daily/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    console.log('🔥 /recommend/daily 被调用，userId:', userId);

    if (isNaN(userId)) {
        return res.status(400).json({ error: '无效的用户ID' });
    }

    db.get(
        `SELECT id, username, age, gender, height, weight, activity_level FROM users WHERE id = ?`,
        [userId],
        (err, user) => {
            if (err) {
                console.error('获取用户信息失败:', err);
                return res.status(500).json({ error: '服务器错误: ' + err.message });
            }
            if (!user) {
                return res.status(404).json({ error: '用户不存在' });
            }

            // 计算 BMR
            let bmr;
            const age = user.age || 25;
            const height = user.height || 170;
            const weight = user.weight || 65;
            if (user.gender === 'female') {
                bmr = 655.1 + 9.563 * weight + 1.85 * height - 4.676 * age;
            } else {
                bmr = 66.47 + 13.75 * weight + 5.003 * height - 6.755 * age;
            }

            const activityMap = { low: 1.2, medium: 1.4, high: 1.6 };
            const factor = activityMap[user.activity_level] || 1.4;
            const tdee = Math.round(bmr * factor);
            const targetCalories = Math.round(tdee * 0.7);

            // 获取7天内已吃的菜
            db.all(
                `SELECT DISTINCT recipe_id FROM recommend_history
                 WHERE user_id = ? AND recommend_date >= date('now', '-7 days')`,
                [userId],
                (err, eaten) => {
                    if (err) {
                        console.error('获取历史记录失败:', err);
                        return res.status(500).json({ error: '服务器错误' });
                    }

                    const eatenIds = eaten.map(row => row.recipe_id);

                    db.all(
                        `SELECT id, name, cuisine, flavor, difficulty, duration, cost, season, steps,
                         (SELECT SUM(calories) FROM ingredients i
                          JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
                          WHERE ri.recipe_id = recipes.id) as total_calories
                         FROM recipes`,
                        (err, recipes) => {
                            if (err) {
                                console.error('获取菜谱失败:', err);
                                return res.status(500).json({ error: '服务器错误' });
                            }

                            let available = recipes.filter(r => !eatenIds.includes(r.id));
                            available = available.map(r => {
                                r.calories = r.total_calories || 300;
                                return r;
                            });

                            const sorted = available.sort((a, b) => {
                                return Math.abs(a.calories - targetCalories / 6) - Math.abs(b.calories - targetCalories / 6);
                            });

                            const selected = sorted.slice(0, 6);

                            let totalCal = 0;
                            selected.forEach(r => { totalCal += r.calories; });

                            const result = {
                                recommend_date: new Date().toISOString().split('T')[0],
                                target_calories: targetCalories,
                                actual_calories: totalCal,
                                recipes: selected.map(r => ({
                                    id: r.id,
                                    name: r.name,
                                    cuisine: r.cuisine,
                                    flavor: r.flavor,
                                    difficulty: r.difficulty,
                                    duration: r.duration,
                                    cost: r.cost,
                                    season: r.season,
                                    steps: r.steps ? r.steps.split(';') : [],
                                    calories: r.calories
                                }))
                            };

                            // 保存推荐历史
                            const stmt = db.prepare(
                                `INSERT INTO recommend_history (user_id, recipe_id, recommend_date, is_adopted)
                                 VALUES (?, ?, date('now'), 0)`
                            );
                            selected.forEach(r => {
                                stmt.run(userId, r.id);
                            });
                            stmt.finalize();

                            res.json(result);
                        }
                    );
                }
            );
        }
    );
});

// ============================================================
// GET /api/recommend/random - 随机探索
// ============================================================
router.get('/recommend/random', (req, res) => {
    const cuisine = req.query.cuisine;
    let sql = `SELECT id, name, cuisine, flavor, difficulty, duration, cost, season, steps FROM recipes`;
    let params = [];
    if (cuisine) {
        sql += ` WHERE cuisine = ?`;
        params.push(cuisine);
    }
    sql += ` ORDER BY RANDOM() LIMIT 1`;

    db.get(sql, params, (err, recipe) => {
        if (err) {
            console.error('随机推荐失败:', err);
            return res.status(500).json({ error: '服务器错误' });
        }
        if (!recipe) {
            return res.status(404).json({ error: '没有找到符合条件的菜谱' });
        }
        res.json(recipe);
    });
});

// ============================================================
// POST /api/recommend/by-ingredients - 基于食材推荐
// ============================================================
router.post('/recommend/by-ingredients', (req, res) => {
    let ingredients = req.body.ingredients;

    if (!ingredients) {
        return res.status(400).json({ error: '请提供食材列表' });
    }

    if (typeof ingredients === 'string') {
        ingredients = ingredients.split(/[,，\s]+/);
    }

    if (!Array.isArray(ingredients)) {
        return res.status(400).json({ error: 'ingredients 格式错误，应为数组或字符串' });
    }

    const cleaned = [];
    for (let i = 0; i < ingredients.length; i++) {
        const item = ingredients[i];
        if (item !== null && item !== undefined && typeof item === 'string') {
            const trimmed = item.trim();
            if (trimmed !== '') {
                cleaned.push(trimmed);
            }
        }
    }

    if (cleaned.length === 0) {
        return res.status(400).json({ error: '未检测到有效食材名称' });
    }

    const placeholders = cleaned.map(() => '?').join(',');

    const sql = `
        SELECT
            r.id,
            r.name,
            r.cuisine,
            r.flavor,
            r.difficulty,
            r.duration,
            r.cost,
            r.season,
            r.steps,
            GROUP_CONCAT(DISTINCT i.name) as all_ingredients,
            GROUP_CONCAT(DISTINCT CASE WHEN i.name IN (${placeholders}) THEN i.name ELSE NULL END) as matched_names
        FROM recipes r
        JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        JOIN ingredients i ON ri.ingredient_id = i.id
        GROUP BY r.id
        HAVING matched_names IS NOT NULL AND matched_names != ''
        ORDER BY LENGTH(matched_names) - LENGTH(REPLACE(matched_names, ',', '')) DESC
    `;

    db.all(sql, cleaned, (err, rows) => {
        if (err) {
            console.error('搜索食材错误:', err);
            return res.status(500).json({ error: '数据库查询失败' });
        }

        if (!rows || rows.length === 0) {
            return res.json([]);
        }

        const result = rows.map(row => {
            const matched = row.matched_names ? row.matched_names.split(',') : [];
            const all = row.all_ingredients ? row.all_ingredients.split(',') : [];
            const missing = all.filter(name => matched.indexOf(name) === -1);
            return {
                id: row.id,
                name: row.name,
                cuisine: row.cuisine,
                flavor: row.flavor,
                difficulty: row.difficulty,
                duration: row.duration,
                cost: row.cost,
                season: row.season,
                steps: row.steps ? row.steps.split(';') : [],
                matchedIngredients: matched,
                missingIngredients: missing
            };
        });

        res.json(result);
    });
});

module.exports = router;