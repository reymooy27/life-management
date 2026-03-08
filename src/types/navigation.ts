export type RootStackParamList = {
  Home: undefined;
  Food: undefined;
  Exercise: undefined;
  Money: undefined;
  AddFood: { editEntry?: any } | undefined;
  AddExercise: { editEntry?: any } | undefined;
  AddExpense: { editEntry?: any } | undefined;
  Settings: undefined;
  Water: undefined;
  AddWater: undefined;
  Portfolio: undefined;
  AddInvestment: { editEntry?: any } | undefined;
  AssetTransactions: {
    ticker: string;
    asset_type: string;
    asset_name: string;
  };
};
