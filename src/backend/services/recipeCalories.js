function getRecipeCalories(db, recipeId) {
  const rows = db.prepare(
    `SELECT i.calories, ri.quantity
     FROM recipe_ingredients ri
     JOIN ingredients i ON i.id = ri.ingredient_id
     WHERE ri.recipe_id = ?`
  ).all(recipeId);

  let total = 0;
  for (const row of rows) {
    total += (row.calories || 0) * row.quantity;
  }
  return total;
}

module.exports = { getRecipeCalories };
