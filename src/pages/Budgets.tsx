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
	const [loading, setLoading] = useState(true);

	const loadBudgets = useCallback(async () => {
		try {
			const loadedBudgets = await getBudgets();
			// Sort by date descending (newest first)
			loadedBudgets.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
			setBudgets(loadedBudgets);
		} catch (error) {
			console.error('Error loading budgets:', error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadBudgets();
	}, [loadBudgets]);

	const handleCreateBudget = async () => {
		const amount = parseFloat(startingAmount);
		if (isNaN(amount)) {
			alert('Please enter a valid starting amount');
			return;
		}

		// Use current date as budget name if no name is provided
		const budgetName = newBudgetName.trim() || new Date().toISOString().split('T')[0];

		// Automatically add recurring expenses as line items
		const recurringExpenses = await getRecurringExpenses();
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

		await createBudget(newBudget);
		setShowCreateModal(false);
		setNewBudgetName('');
		setStartingAmount('0');

		// Navigate to the newly created budget
		navigate(`/budgets/${newBudget.id}`);
	};

	const handleDelete = async (id: string) => {
		if (confirm('Are you sure you want to delete this budget?')) {
			await deleteBudget(id);
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
		<div className="mx-auto max-w-6xl p-6">
			<div className="mb-8 flex items-center justify-between">
				<h1 className="text-4xl font-black text-shadow-glow">💰 My Budgets</h1>
				<button
					type="button"
					onClick={() => setShowCreateModal(true)}
					className="gradient-success rounded-xl px-6 py-3 font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-2xl"
				>
					✨ Create New Budget
				</button>
			</div>

			{loading ? (
				<div className="glass-effect rounded-2xl p-12 text-center shadow-xl">
					<p className="text-xl text-white/80">Loading budgets...</p>
				</div>
			) : budgets.length === 0 ? (
				<div className="glass-effect rounded-2xl p-12 text-center shadow-xl">
					<p className="text-xl text-white/80">No budgets yet. Create your first budget to get started! 🚀</p>
				</div>
			) : (
				<div className="space-y-4">
					{budgets.map((budget) => (
						<div
							key={budget.id}
							className="card-hover glass-effect flex items-center justify-between rounded-2xl p-6 shadow-xl"
						>
							<div>
								<h3 className="text-2xl font-bold text-white">{budget.name}</h3>
								<p className="text-sm text-white/70">📅 Created: {formatDate(budget.dateCreated)}</p>
								<p className="gradient-gold mt-1 inline-block rounded-lg px-3 py-1 text-sm font-bold text-purple-900">
									💵 ${budget.startingAmount.toFixed(2)}
								</p>
							</div>
							<div className="flex gap-3">
								<Link
									to={`/budgets/${budget.id}`}
									className="gradient-success rounded-xl px-6 py-3 font-bold text-white shadow-lg transition-all hover:scale-105"
								>
									👁️ View
								</Link>
								<button
									type="button"
									onClick={() => handleDelete(budget.id)}
									className="gradient-secondary rounded-xl px-6 py-3 font-bold text-white shadow-lg transition-all hover:scale-105"
								>
									🗑️ Delete
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Create Budget Modal */}
			{showCreateModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
					<div className="glass-effect w-full max-w-md rounded-2xl p-8 shadow-2xl">
						<h2 className="mb-6 text-3xl font-black text-shadow-glow">✨ Create New Budget</h2>
						<div className="mb-6">
							<label className="mb-2 block text-sm font-bold text-white/90">Budget Name (e.g., 2025-11-01)</label>
							<input
								type="text"
								value={newBudgetName}
								onChange={(e) => setNewBudgetName(e.target.value)}
								placeholder="2025-11-01"
								className="w-full rounded-xl border-2 border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 backdrop-blur-sm focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
							/>
						</div>
						<div className="mb-8">
							<label className="mb-2 block text-sm font-bold text-white/90">Starting Amount</label>
							<input
								type="number"
								step="0.01"
								value={startingAmount}
								onChange={(e) => setStartingAmount(e.target.value)}
								className="w-full rounded-xl border-2 border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 backdrop-blur-sm focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
							/>
						</div>
						<div className="flex justify-end gap-3">
							<button
								type="button"
								onClick={() => {
									setShowCreateModal(false);
									setNewBudgetName('');
									setStartingAmount('0');
								}}
								className="rounded-xl bg-white/20 px-6 py-3 font-bold text-white backdrop-blur-sm transition-all hover:bg-white/30"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleCreateBudget}
								className="gradient-success rounded-xl px-6 py-3 font-bold text-white shadow-lg transition-all hover:scale-105"
							>
								Create 🚀
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
