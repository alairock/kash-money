export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  link?: string;
  note?: string;
  isAutomatic?: boolean; // If true, status will be 'automatic' when copied to budget
  order: number; // For maintaining custom sort order
}

export interface BudgetLineItem {
  id: string;
  status: 'incomplete' | 'complete' | 'automatic';
  name: string;
  amount: number;
  link?: string;
  note?: string;
  isRecurring: boolean;
  isMarked: boolean; // Marked items excluded from first total
}

export interface Budget {
  id: string;
  name: string; // e.g., "2025-11-01"
  dateCreated: string;
  startingAmount: number;
  lineItems: BudgetLineItem[];
}
