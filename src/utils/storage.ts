import type { Budget, RecurringExpense } from '../types/budget';

const BUDGETS_KEY = 'budgets';
const RECURRING_EXPENSES_KEY = 'recurringExpenses';

// Budgets
export const getBudgets = (): Budget[] => {
  const data = localStorage.getItem(BUDGETS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveBudgets = (budgets: Budget[]): void => {
  localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
};

export const getBudget = (id: string): Budget | undefined => {
  const budgets = getBudgets();
  return budgets.find((b) => b.id === id);
};

export const createBudget = (budget: Budget): void => {
  const budgets = getBudgets();
  budgets.push(budget);
  saveBudgets(budgets);
};

export const updateBudget = (budget: Budget): void => {
  const budgets = getBudgets();
  const index = budgets.findIndex((b) => b.id === budget.id);
  if (index !== -1) {
    budgets[index] = budget;
    saveBudgets(budgets);
  }
};

export const deleteBudget = (id: string): void => {
  const budgets = getBudgets();
  const filtered = budgets.filter((b) => b.id !== id);
  saveBudgets(filtered);
};

// Recurring Expenses
export const getRecurringExpenses = (): RecurringExpense[] => {
  const data = localStorage.getItem(RECURRING_EXPENSES_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveRecurringExpenses = (expenses: RecurringExpense[]): void => {
  localStorage.setItem(RECURRING_EXPENSES_KEY, JSON.stringify(expenses));
};

export const createRecurringExpense = (expense: RecurringExpense): void => {
  const expenses = getRecurringExpenses();
  expenses.push(expense);
  saveRecurringExpenses(expenses);
};

export const updateRecurringExpense = (expense: RecurringExpense): void => {
  const expenses = getRecurringExpenses();
  const index = expenses.findIndex((e) => e.id === expense.id);
  if (index !== -1) {
    expenses[index] = expense;
    saveRecurringExpenses(expenses);
  }
};

export const deleteRecurringExpense = (id: string): void => {
  const expenses = getRecurringExpenses();
  const filtered = expenses.filter((e) => e.id !== id);
  saveRecurringExpenses(filtered);
};
