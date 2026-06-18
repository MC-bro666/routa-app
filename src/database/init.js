const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'recipe.db');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);
console.log('Tables created successfully.');

const recipes = [
    { name: '番茄炒蛋', cuisine: '中式', flavor: '酸甜', difficulty: 'easy', duration: 15, cost: 'low', season: '全年', steps: '1.番茄切块，鸡蛋打散\n2.热油炒鸡蛋至凝固盛出\n3.炒番茄至出汁\n4.倒入鸡蛋翻炒均匀，加盐调味' },
    { name: '宫保鸡丁', cuisine: '中式', flavor: '辣', difficulty: 'medium', duration: 30, cost: 'medium', season: '全年', steps: '1.鸡胸肉切丁腌制\n2.花生米炒香\n3.调好宫保汁\n4.爆炒鸡丁，加入配料和宫保汁\n5.撒上花生米出锅' },
    { name: '清蒸鲈鱼', cuisine: '中式', flavor: '鲜', difficulty: 'medium', duration: 25, cost: 'high', season: '秋季', steps: '1.鲈鱼处理干净，划几刀\n2.姜片葱段铺底，放上鱼\n3.水开后蒸8-10分钟\n4.倒掉蒸鱼水，淋上蒸鱼豉油\n5.热油浇在葱姜丝上' },
    { name: '麻婆豆腐', cuisine: '中式', flavor: '麻辣', difficulty: 'easy', duration: 20, cost: 'low', season: '全年', steps: '1.豆腐切块焯水\n2.肉末炒香\n3.加入豆瓣酱炒出红油\n4.加水和豆腐煮5分钟\n5.勾芡，撒花椒粉和葱花' },
    { name: '西芹百合炒虾仁', cuisine: '中式', flavor: '清淡', difficulty: 'medium', duration: 20, cost: 'high', season: '春季', steps: '1.虾仁去虾线腌制\n2.西芹切段焯水\n3.百合洗净\n4.热油炒虾仁至变色\n5.加入西芹和百合翻炒，调味' },
    { name: '红烧排骨', cuisine: '中式', flavor: '咸甜', difficulty: 'medium', duration: 60, cost: 'high', season: '全年', steps: '1.排骨焯水去血沫\n2.炒糖色\n3.加入排骨翻炒上色\n4.加料酒、生抽、老抽、八角、桂皮\n5.加水没过排骨，小火炖40分钟\n6.大火收汁' },
    { name: '凉拌黄瓜', cuisine: '中式', flavor: '清爽', difficulty: 'easy', duration: 10, cost: 'low', season: '夏季', steps: '1.黄瓜拍碎切段\n2.蒜末、醋、生抽、糖、香油调汁\n3.浇在黄瓜上拌匀' },
    { name: '意大利肉酱面', cuisine: '西式', flavor: '咸香', difficulty: 'medium', duration: 35, cost: 'medium', season: '全年', steps: '1.洋葱蒜末炒香\n2.加入肉末炒至变色\n3.倒入番茄罐头和番茄酱\n4.小火炖20分钟\n5.煮意面至弹牙\n6.浇上肉酱，撒芝士粉' },
    { name: '日式味噌汤', cuisine: '日式', flavor: '鲜', difficulty: 'easy', duration: 15, cost: 'low', season: '全年', steps: '1.海带泡发切丝\n2.豆腐切丁\n3.水开后将海带和豆腐煮3分钟\n4.关火，溶入味噌\n5.撒葱花即可' },
    { name: '泰式冬阴功汤', cuisine: '泰式', flavor: '酸辣', difficulty: 'hard', duration: 30, cost: 'medium', season: '冬季', steps: '1.虾去壳去虾线\n2.香茅、南姜、柠檬叶拍碎\n3.煮鸡汤底加入香料\n4.加入蘑菇和虾\n5.加入冬阴功酱、鱼露、椰奶\n6.挤入青柠汁，撒香菜' }
];

const ingredients = [
    { name: '番茄', category: '蔬菜', calories: 18, season_month: '6-8' },
    { name: '鸡蛋', category: '蛋类', calories: 144, season_month: '全年' },
    { name: '鸡胸肉', category: '肉类', calories: 165, season_month: '全年' },
    { name: '花生米', category: '坚果', calories: 567, season_month: '全年' },
    { name: '鲈鱼', category: '水产', calories: 105, season_month: '9-11' },
    { name: '豆腐', category: '豆制品', calories: 76, season_month: '全年' },
    { name: '虾仁', category: '水产', calories: 93, season_month: '全年' },
    { name: '西芹', category: '蔬菜', calories: 16, season_month: '3-5' },
    { name: '百合', category: '蔬菜', calories: 82, season_month: '8-10' },
    { name: '排骨', category: '肉类', calories: 264, season_month: '全年' },
    { name: '黄瓜', category: '蔬菜', calories: 15, season_month: '5-8' },
    { name: '意大利面', category: '主食', calories: 350, season_month: '全年' },
    { name: '牛肉末', category: '肉类', calories: 250, season_month: '全年' },
    { name: '海带', category: '海产品', calories: 12, season_month: '全年' },
    { name: '味噌', category: '调味品', calories: 200, season_month: '全年' },
    { name: '虾', category: '水产', calories: 99, season_month: '全年' },
    { name: '蘑菇', category: '蔬菜', calories: 22, season_month: '全年' },
    { name: '香茅', category: '调味品', calories: 5, season_month: '夏季' }
];

const recipeIngredients = [
    { recipe: 1, ingredient: 1, qty: 2, unit: '个' },
    { recipe: 1, ingredient: 2, qty: 3, unit: '个' },
    { recipe: 2, ingredient: 3, qty: 300, unit: '克' },
    { recipe: 2, ingredient: 4, qty: 30, unit: '克' },
    { recipe: 3, ingredient: 5, qty: 1, unit: '条' },
    { recipe: 4, ingredient: 6, qty: 1, unit: '块' },
    { recipe: 5, ingredient: 7, qty: 200, unit: '克' },
    { recipe: 5, ingredient: 8, qty: 100, unit: '克' },
    { recipe: 5, ingredient: 9, qty: 50, unit: '克' },
    { recipe: 6, ingredient: 10, qty: 500, unit: '克' },
    { recipe: 7, ingredient: 11, qty: 2, unit: '根' },
    { recipe: 8, ingredient: 12, qty: 200, unit: '克' },
    { recipe: 8, ingredient: 13, qty: 150, unit: '克' },
    { recipe: 9, ingredient: 14, qty: 20, unit: '克' },
    { recipe: 9, ingredient: 6, qty: 100, unit: '克' },
    { recipe: 9, ingredient: 15, qty: 30, unit: '克' },
    { recipe: 10, ingredient: 16, qty: 200, unit: '克' },
    { recipe: 10, ingredient: 17, qty: 100, unit: '克' }
];

const insertRecipe = db.prepare('INSERT OR IGNORE INTO recipes (name, cuisine, flavor, difficulty, duration, cost, season, steps) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
for (const r of recipes) {
    insertRecipe.run(r.name, r.cuisine, r.flavor, r.difficulty, r.duration, r.cost, r.season, r.steps);
}

const insertIngredient = db.prepare('INSERT OR IGNORE INTO ingredients (name, category, calories, season_month) VALUES (?, ?, ?, ?)');
for (const ing of ingredients) {
    insertIngredient.run(ing.name, ing.category, ing.calories, ing.season_month);
}

const insertLink = db.prepare('INSERT OR IGNORE INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?)');
for (const link of recipeIngredients) {
    insertLink.run(link.recipe, link.ingredient, link.qty, link.unit);
}

console.log('Seed data inserted successfully.');
db.close();
