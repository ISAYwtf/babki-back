export interface CategoryExpense {
  categoryId: string;
  total: number;
}

export interface PeriodReport {
  period: string;
  expenses: number;
  incomes: number;
  saves: number;
  saving: number;
  balance: number;
  expensesByCategory: CategoryExpense[];
}
