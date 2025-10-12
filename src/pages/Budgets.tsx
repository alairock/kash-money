import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Budget, BudgetLineItem } from '../types/budget';
import { getBudgets, createBudget, deleteBudget, getRecurringExpenses } from '../utils/storage';

export const Budgets = () => {
	const navigate = useNavigate();
	const [budgets, setBudgets] = useState<Budget[]>([]);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [newBudgetName, setNewBudgetName] = useState('');
	const [startingAmount, setStartingAmount] = useState('0');

	const loadBudgets = useCallback(() => {
		const loadedBudgets = getBudgets();
		// Sort by date descending (newest first)
		loadedBudgets.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
		// eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
		setBudgets(loadedBudgets);
	}, []);

	useEffect(() => {
		loadBudgets();
	}, [loadBudgets]);

	const handleCreateBudget = () => {
		const amount = parseFloat(startingAmount);
		if (isNaN(amount)) {
			alert('Please enter a valid starting amount');
			return;
		}

		// Use current date as budget name if no name is provided
		const budgetName = newBudgetName.trim() || new Date().toISOString().split('T')[0];

		// Automatically add recurring expenses as line items
		const recurringExpenses = getRecurringExpenses();
		const lineItems: BudgetLineItem[] = recurringExpenses.map(expense => {
			// Determine initial status based on conditions
			let status: 'incomplete' | 'complete' | 'automatic';
			if (expense.amount === 0) {
				status = 'complete';
			} else if (expense.isAutomatic) {
				status = 'automatic';
			} else {
				status = 'incomplete';
			}

			return {
				id: crypto.randomUUID(),
				status,
				name: expense.name,
				amount: expense.amount,
				link: expense.link,
				note: expense.note,
				isRecurring: true,
				isMarked: false,
			};
		});

		const newBudget: Budget = {
			id: crypto.randomUUID(),
			name: budgetName,
			dateCreated: new Date().toISOString(),
			startingAmount: amount,
			lineItems,
		};

		createBudget(newBudget);
		setShowCreateModal(false);
		setNewBudgetName('');
		setStartingAmount('0');

		// Navigate to the newly created budget
		navigate(`/budgets/${newBudget.id}`);
	};

	const handleDelete = (id: string) => {
		if (confirm('Are you sure you want to delete this budget?')) {
			deleteBudget(id);
			loadBudgets();
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	};

	return (
		<div className="mx-auto max-w-4xl p-6">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-3xl font-bold">My Budgets</h1>
				<button
					type="button"
					onClick={() => setShowCreateModal(true)}
					className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
				>
					Create New Budget
				</button>
			</div>

			{budgets.length === 0 ? (
				<div className="rounded-lg border border-gray-700 bg-gray-800 p-8 text-center">
					<p className="text-gray-400">No budgets yet. Create your first budget to get started!</p>
				</div>
			) : (
				<div className="space-y-4">
					{budgets.map((budget) => (
						<div
							key={budget.id}
							className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-4"
						>
							<div>
								<h3 className="text-xl font-semibold">{budget.name}</h3>
								<p className="text-sm text-gray-400">Created: {formatDate(budget.dateCreated)}</p>
								<p className="text-sm text-gray-400">Starting Amount: ${budget.startingAmount.toFixed(2)}</p>
							</div>
							<div className="flex gap-2">
								<Link
									to={`/budgets/${budget.id}`}
									className="rounded bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
								>
									View
								</Link>
								<button
									type="button"
									onClick={() => handleDelete(budget.id)}
									className="rounded bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
								>
									Delete
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Create Budget Modal */}
			{showCreateModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
					<div className="w-full max-w-md rounded-lg bg-gray-800 p-6">
						<h2 className="mb-4 text-2xl font-bold">Create New Budget</h2>
						<div className="mb-4">
							<label className="mb-2 block text-sm font-medium">Budget Name (e.g., 2025-11-01)</label>
							<input
								type="text"
								value={newBudgetName}
								onChange={(e) => setNewBudgetName(e.target.value)}
								placeholder="2025-11-01"
								className="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white"
							/>
						</div>
						<div className="mb-6">
							<label className="mb-2 block text-sm font-medium">Starting Amount</label>
							<input
								type="number"
								step="0.01"
								value={startingAmount}
								onChange={(e) => setStartingAmount(e.target.value)}
								className="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-white"
							/>
						</div>
						<div className="flex justify-end gap-2">
							<button
								type="button"
								onClick={() => {
									setShowCreateModal(false);
									setNewBudgetName('');
									setStartingAmount('0');
								}}
								className="rounded bg-gray-600 px-4 py-2 font-medium text-white hover:bg-gray-700"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleCreateBudget}
								className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
							>
								Create
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
