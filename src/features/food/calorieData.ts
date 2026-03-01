export interface FoodItem {
  name: string;
  caloriesPerServing: number;
  servingSize: string;
}

export const FOOD_DATABASE: FoodItem[] = [
  { name: 'Oatmeal', caloriesPerServing: 150, servingSize: '1 cup' },
  { name: 'Banana', caloriesPerServing: 105, servingSize: '1 medium' },
  { name: 'Apple', caloriesPerServing: 95, servingSize: '1 medium' },
  { name: 'Chicken Breast', caloriesPerServing: 165, servingSize: '100g' },
  { name: 'Brown Rice', caloriesPerServing: 215, servingSize: '1 cup cooked' },
  { name: 'Salmon', caloriesPerServing: 208, servingSize: '100g' },
  { name: 'Egg', caloriesPerServing: 78, servingSize: '1 large' },
  { name: 'Greek Yogurt', caloriesPerServing: 100, servingSize: '170g' },
  { name: 'Avocado', caloriesPerServing: 240, servingSize: '1 whole' },
  { name: 'Sweet Potato', caloriesPerServing: 103, servingSize: '1 medium' },
  { name: 'Broccoli', caloriesPerServing: 55, servingSize: '1 cup' },
  { name: 'White Rice', caloriesPerServing: 206, servingSize: '1 cup cooked' },
  { name: 'Pasta', caloriesPerServing: 220, servingSize: '1 cup cooked' },
  { name: 'Bread (White)', caloriesPerServing: 79, servingSize: '1 slice' },
  { name: 'Bread (Whole Wheat)', caloriesPerServing: 81, servingSize: '1 slice' },
  { name: 'Milk (Whole)', caloriesPerServing: 149, servingSize: '1 cup' },
  { name: 'Orange Juice', caloriesPerServing: 112, servingSize: '1 cup' },
  { name: 'Almonds', caloriesPerServing: 164, servingSize: '28g' },
  { name: 'Peanut Butter', caloriesPerServing: 188, servingSize: '2 tbsp' },
  { name: 'Steak', caloriesPerServing: 271, servingSize: '100g' },
  { name: 'Tuna', caloriesPerServing: 132, servingSize: '100g' },
  { name: 'Spinach', caloriesPerServing: 7, servingSize: '1 cup raw' },
  { name: 'Coffee (Black)', caloriesPerServing: 2, servingSize: '1 cup' },
];

export function searchFoods(query: string): FoodItem[] {
  if (!query.trim()) return [];
  const lowerQuery = query.toLowerCase();
  return FOOD_DATABASE.filter(food =>
    food.name.toLowerCase().includes(lowerQuery)
  );
}
