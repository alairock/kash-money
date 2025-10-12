import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import type { Budget, RecurringExpense } from '../types/budget';

const BUDGETS_COLLECTION = 'budgets';
const RECURRING_EXPENSES_COLLECTION = 'recurringExpenses';

// Helper to get user ID from authenticated user
const getUserId = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('User not authenticated');
  }
  return uid;
};

// Budgets
export const getBudgets = async (): Promise<Budget[]> => {
  try {
    const userId = getUserId();
    const budgetsRef = collection(db, 'users', userId, BUDGETS_COLLECTION);
    const q = query(budgetsRef, orderBy('dateCreated', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Budget[];
  } catch (error) {
    console.error('Error getting budgets:', error);
    return [];
  }
};

export const getBudget = async (id: string): Promise<Budget | undefined> => {
  try {
    const userId = getUserId();
    const budgetRef = doc(db, 'users', userId, BUDGETS_COLLECTION, id);
    const snapshot = await getDoc(budgetRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Budget;
    }
    return undefined;
  } catch (error) {
    console.error('Error getting budget:', error);
    return undefined;
  }
};

export const createBudget = async (budget: Budget): Promise<void> => {
  try {
    const userId = getUserId();
    const budgetsRef = collection(db, 'users', userId, BUDGETS_COLLECTION);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...budgetData } = budget;
    await addDoc(budgetsRef, budgetData);
  } catch (error) {
    console.error('Error creating budget:', error);
    throw error;
  }
};

export const updateBudget = async (budget: Budget): Promise<void> => {
  try {
    const userId = getUserId();
    const budgetRef = doc(db, 'users', userId, BUDGETS_COLLECTION, budget.id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...budgetData } = budget;
    await updateDoc(budgetRef, budgetData);
  } catch (error) {
    console.error('Error updating budget:', error);
    throw error;
  }
};

export const deleteBudget = async (id: string): Promise<void> => {
  try {
    const userId = getUserId();
    const budgetRef = doc(db, 'users', userId, BUDGETS_COLLECTION, id);
    await deleteDoc(budgetRef);
  } catch (error) {
    console.error('Error deleting budget:', error);
    throw error;
  }
};

// Recurring Expenses
export const getRecurringExpenses = async (): Promise<RecurringExpense[]> => {
  try {
    const userId = getUserId();
    const expensesRef = collection(
      db,
      'users',
      userId,
      RECURRING_EXPENSES_COLLECTION,
    );
    const snapshot = await getDocs(expensesRef);
    const expenses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as RecurringExpense[];

    // Sort by order field, with fallback for items without order
    return expenses.sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
  } catch (error) {
    console.error('Error getting recurring expenses:', error);
    return [];
  }
};

export const createRecurringExpense = async (
  expense: RecurringExpense,
): Promise<void> => {
  try {
    const userId = getUserId();
    const expenseRef = doc(
      db,
      'users',
      userId,
      RECURRING_EXPENSES_COLLECTION,
      expense.id,
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...expenseData } = expense;
    await setDoc(expenseRef, expenseData);
  } catch (error) {
    console.error('Error creating recurring expense:', error);
    throw error;
  }
};

export const updateRecurringExpense = async (
  expense: RecurringExpense,
): Promise<void> => {
  try {
    const userId = getUserId();
    const expenseRef = doc(
      db,
      'users',
      userId,
      RECURRING_EXPENSES_COLLECTION,
      expense.id,
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...expenseData } = expense;
    await updateDoc(expenseRef, expenseData);
  } catch (error) {
    console.error('Error updating recurring expense:', error);
    throw error;
  }
};

export const deleteRecurringExpense = async (id: string): Promise<void> => {
  try {
    const userId = getUserId();
    const expenseRef = doc(
      db,
      'users',
      userId,
      RECURRING_EXPENSES_COLLECTION,
      id,
    );
    await deleteDoc(expenseRef);
  } catch (error) {
    console.error('Error deleting recurring expense:', error);
    throw error;
  }
};

// Migration helper - copy data from localStorage to Firebase
export const migrateFromLocalStorage = async (): Promise<void> => {
  try {
    // Get data from localStorage
    const budgetsData = localStorage.getItem('budgets');
    const expensesData = localStorage.getItem('recurringExpenses');

    if (budgetsData) {
      const budgets = JSON.parse(budgetsData) as Budget[];
      for (const budget of budgets) {
        await createBudget(budget);
      }
      console.log(`Migrated ${budgets.length} budgets`);
    }

    if (expensesData) {
      const expenses = JSON.parse(expensesData) as RecurringExpense[];
      for (const expense of expenses) {
        await createRecurringExpense(expense);
      }
      console.log(`Migrated ${expenses.length} recurring expenses`);
    }

    console.log('Migration complete!');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
};
