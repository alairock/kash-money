# Budget Tracking Application

A finance/budgeting application to replace spreadsheet-based budget management.

## Features

### Budgets Page (`/budgets`)
- View all your budgets in a list
- Create new budgets with:
  - Custom name (e.g., "2025-11-01")
  - Starting amount
  - Creation date (auto-generated)
- Delete existing budgets
- Click "View" to see budget details

### Budget Detail Page (`/budgets/:id`)
- Edit starting amount
- Add recurring expenses from your config
- Add ad-hoc line items
- Inline editing of all line items with:
  - Status (Pending, Paid, Cleared)
  - Name
  - Amount
  - Link (optional)
  - Note (optional)
  - Marked checkbox (for exclusion from first total)
- Two total calculations:
  - **Unmarked Total**: Starting amount minus unmarked items only
  - **Final Total**: Starting amount minus all items

### Config Page (`/config`)
- Manage recurring bills/expenses
- Add, edit, and delete recurring items
- Set estimated values for recurring items
- When copied to a budget, values can be edited without affecting the config

## Data Structure

### Budget Line Items
Each line item tracks:
- Status (pending/paid/cleared)
- Name
- Amount
- Link (optional)
- Note (optional)
- Type (recurring or ad-hoc)
- Marked status (for total calculations)

### Recurring Expenses
Stored in config and copied into new budgets:
- Name
- Estimated amount
- Link (optional)
- Note (optional)

## Data Storage

All data is stored in browser localStorage:
- Budgets are stored under the `budgets` key
- Recurring expenses are stored under the `recurringExpenses` key

## Usage

1. **Set up recurring expenses**: Go to the Config page and add your recurring bills
2. **Create a budget**: Click "Create New Budget" on the Budgets page
3. **Add items**: In the budget view, add recurring expenses and/or ad-hoc items
4. **Track spending**: Mark items as paid/cleared, use the "marked" checkbox to exclude certain items from the first total
5. **Monitor totals**: Watch your remaining balance update as you add and modify items

## Tech Stack

- React 19.1.1
- TypeScript
- Vite
- React Router 6
- Tailwind CSS
- LocalStorage for data persistence
