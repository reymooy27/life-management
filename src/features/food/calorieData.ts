export interface FoodItem {
  name: string;
  caloriesPerServing: number;
  servingSize: string;
  category?: string;
  protein?: number;
  carbs?: number;
  fats?: number;
}

export const FOOD_DATABASE: FoodItem[] = [
  { name: 'Oatmeal', caloriesPerServing: 150, servingSize: '1 cup', category: 'Breakfast', protein: 5, carbs: 27, fats: 3 },
  { name: 'Banana', caloriesPerServing: 105, servingSize: '1 medium', category: 'Snack', protein: 1, carbs: 27, fats: 0 },
  { name: 'Apple', caloriesPerServing: 95, servingSize: '1 medium', category: 'Snack', protein: 0, carbs: 25, fats: 0 },
  { name: 'Chicken Breast', caloriesPerServing: 165, servingSize: '100g', category: 'Dinner', protein: 31, carbs: 0, fats: 4 },
  { name: 'Brown Rice', caloriesPerServing: 215, servingSize: '1 cup cooked', category: 'Dinner', protein: 5, carbs: 45, fats: 2 },
  { name: 'Salmon', caloriesPerServing: 208, servingSize: '100g', category: 'Dinner', protein: 20, carbs: 0, fats: 13 },
  { name: 'Egg', caloriesPerServing: 78, servingSize: '1 large', category: 'Breakfast', protein: 6, carbs: 1, fats: 5 },
  { name: 'Greek Yogurt', caloriesPerServing: 100, servingSize: '170g', category: 'Snack', protein: 17, carbs: 6, fats: 1 },
  { name: 'Avocado', caloriesPerServing: 240, servingSize: '1 whole', category: 'Snack', protein: 3, carbs: 12, fats: 22 },
  { name: 'Sweet Potato', caloriesPerServing: 103, servingSize: '1 medium', category: 'Lunch', protein: 2, carbs: 24, fats: 0 },
  { name: 'Broccoli', caloriesPerServing: 55, servingSize: '1 cup', category: 'Lunch', protein: 4, carbs: 11, fats: 1 },
  { name: 'White Rice', caloriesPerServing: 206, servingSize: '1 cup cooked', category: 'Lunch', protein: 4, carbs: 45, fats: 0 },
  { name: 'Pasta', caloriesPerServing: 220, servingSize: '1 cup cooked', category: 'Dinner', protein: 8, carbs: 43, fats: 1 },
  { name: 'Bread (White)', caloriesPerServing: 79, servingSize: '1 slice', category: 'Breakfast', protein: 3, carbs: 15, fats: 1 },
  { name: 'Bread (Whole Wheat)', caloriesPerServing: 81, servingSize: '1 slice', category: 'Breakfast', protein: 4, carbs: 14, fats: 1 },
  { name: 'Milk (Whole)', caloriesPerServing: 149, servingSize: '1 cup', category: 'Breakfast', protein: 8, carbs: 12, fats: 8 },
  { name: 'Orange Juice', caloriesPerServing: 112, servingSize: '1 cup', category: 'Breakfast', protein: 2, carbs: 26, fats: 0 },
  { name: 'Almonds', caloriesPerServing: 164, servingSize: '28g', category: 'Snack', protein: 6, carbs: 6, fats: 14 },
  { name: 'Peanut Butter', caloriesPerServing: 188, servingSize: '2 tbsp', category: 'Snack', protein: 8, carbs: 6, fats: 16 },
  { name: 'Steak', caloriesPerServing: 271, servingSize: '100g', category: 'Dinner', protein: 25, carbs: 0, fats: 19 },
  { name: 'Tuna', caloriesPerServing: 132, servingSize: '100g', category: 'Lunch', protein: 29, carbs: 0, fats: 1 },
  { name: 'Spinach', caloriesPerServing: 7, servingSize: '1 cup raw', category: 'Lunch', protein: 1, carbs: 1, fats: 0 },
  { name: 'Coffee (Black)', caloriesPerServing: 2, servingSize: '1 cup', category: 'Breakfast', protein: 0, carbs: 0, fats: 0 },
];

export function searchFoods(query: string): FoodItem[] {
  if (!query.trim()) return [];
  const lowerQuery = query.toLowerCase();
  return FOOD_DATABASE.filter(food =>
    food.name.toLowerCase().includes(lowerQuery)
  );
}
