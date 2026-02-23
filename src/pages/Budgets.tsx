import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Budget, BudgetLineItem } from '../types/budget';
import { getBudgets, createBudget, deleteBudget, getRecurringExpenses } from '../utils/storage';
import { formatCurrency } from '../utils/formatCurrency';
import { getCurrentUserLimits } from '../utils/superAdminStorage';
import { countItemsCreatedThisMonth, isPlanLimitError, PLAN_LIMIT_REACHED_TOOLTIP } from '../utils/limits';
import { Tooltip } from '../components/Tooltip';

export const Budgets = () => {
	const navigate = useNavigate();
	const primaryButtonClass =
		'gradient-primary rounded-xl px-4 py-3 font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-2xl';
	const dangerButtonClass =
		'gradient-secondary rounded-xl px-4 py-3 font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-2xl';
	const [budgets, setBudgets] = useState<Budget[]>([]);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [newBudgetName, setNewBudgetName] = useState('');
	const [startingAmount, setStartingAmount] = useState('0');
	const [loading, setLoading] = useState(true);
	const [budgetLimit, setBudgetLimit] = useState(1);

	const loadBudgets = useCallback(async () => {
		try {
			const [loadedBudgets, limits] = await Promise.all([getBudgets(), getCurrentUserLimits()]);
			// Sort by date descending (newest first)
			loadedBudgets.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
			setBudgets(loadedBudgets);
			setBudgetLimit(limits.budgetsPerMonth);
		} catch (error) {
			console.error('Error loading budgets:', error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadBudgets();
	}, [loadBudgets]);

	const budgetsThisMonth = countItemsCreatedThisMonth(budgets);
	const createBudgetDisabled = budgetsThisMonth >= budgetLimit;

	const handleCreateBudget = async () => {
		if (createBudgetDisabled) {
			alert(PLAN_LIMIT_REACHED_TOOLTIP);
			return;
		}

		const amount = parseFloat(startingAmount);
		if (isNaN(amount)) {
			alert('Please enter a valid starting amount');
			return;
		}

		// Use current date as budget name if no name is provided
		const budgetName = newBudgetName.trim() || new Date().toISOString().split('T')[0];

		try {
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
					link: expense.link || '',
					note: expense.note || '',
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
		} catch (error) {
			if (isPlanLimitError(error)) {
				alert(PLAN_LIMIT_REACHED_TOOLTIP);
				return;
			}

			console.error('Error creating budget:', error);
			alert('Failed to create budget');
		}
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
			<div className="mx-auto max-w-6xl p-4 sm:p-6">
				<div className="mb-6 flex justify-end sm:mb-8">
					<Tooltip content={createBudgetDisabled ? PLAN_LIMIT_REACHED_TOOLTIP : ''}>
						<div className="w-full sm:w-auto">
							<button
								type="button"
								onClick={() => setShowCreateModal(true)}
								disabled={createBudgetDisabled}
								className={`${primaryButtonClass} w-full text-base disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-60 disabled:hover:scale-100 sm:w-auto sm:px-6`}
							>
								<span className="sm:hidden">✨ Create Budget</span>
								<span className="hidden sm:inline">✨ Create New Budget</span>
							</button>
						</div>
					</Tooltip>
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
				<>
					<div className="space-y-4 md:hidden">
						{budgets.map((budget) => (
							<div
								key={budget.id}
								className="card-hover glass-effect flex flex-col gap-4 rounded-2xl p-5 shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-6"
							>
								<div className="min-w-0">
									<h3 className="break-words text-2xl font-bold text-white">{budget.name}</h3>
									<p className="text-sm text-white/70">📅 Created: {formatDate(budget.dateCreated)}</p>
									<p className="gradient-gold mt-1 inline-block rounded-lg px-3 py-1 text-sm font-bold text-purple-900">
										💵 {formatCurrency(budget.startingAmount)}
									</p>
								</div>
								<div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:flex">
									<Link
										to={`/budgets/${budget.id}`}
										className={`${primaryButtonClass} text-center sm:px-6`}
									>
										👁️ View
									</Link>
									<button
										type="button"
										onClick={() => handleDelete(budget.id)}
										className={`${dangerButtonClass} sm:px-6`}
									>
										🗑️ Delete
									</button>
								</div>
							</div>
						))}
					</div>

					<div className="glass-effect hidden overflow-x-auto rounded-2xl p-5 shadow-xl md:block sm:p-6">
						<table className="w-full">
							<thead className="border-b-2 border-white/20">
								<tr>
									<th className="px-4 py-3 text-left text-sm font-bold">Budget</th>
									<th className="px-4 py-3 text-left text-sm font-bold">Created</th>
									<th className="px-4 py-3 text-left text-sm font-bold">Starting Amount</th>
									<th className="px-4 py-3 text-left text-sm font-bold">Actions</th>
								</tr>
							</thead>
							<tbody>
								{budgets.map((budget) => (
									<tr key={budget.id} className="border-b border-white/10 transition-all hover:bg-white/5">
										<td className="px-4 py-3">
											<span className="font-bold text-white">{budget.name}</span>
										</td>
										<td className="px-4 py-3 text-sm text-white/80">{formatDate(budget.dateCreated)}</td>
										<td className="px-4 py-3">
											<span className="gradient-gold inline-block rounded-lg px-3 py-1 text-sm font-bold text-purple-900">
												{formatCurrency(budget.startingAmount)}
											</span>
										</td>
										<td className="px-4 py-3">
											<div className="flex gap-2">
												<Link to={`/budgets/${budget.id}`} className={`${primaryButtonClass} px-4 py-2 text-sm`}>
													👁️ View
												</Link>
												<button
													type="button"
													onClick={() => handleDelete(budget.id)}
													className={`${dangerButtonClass} px-4 py-2 text-sm`}
												>
													🗑️ Delete
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</>
			)}

			{/* Create Budget Modal */}
			{showCreateModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
					<div className="glass-effect mx-4 w-full max-w-md rounded-2xl p-6 shadow-2xl sm:p-8">
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
								className={`${primaryButtonClass} px-6`}
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
