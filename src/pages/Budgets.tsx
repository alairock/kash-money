import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Budget, BudgetLineItem } from '../types/budget';
import {
	getBudgetsPage,
	createBudget,
	deleteBudget,
	getRecurringExpenses,
	getBudgetsCount,
	getBudgetsCreatedThisMonthCount,
	type BudgetsPageCursor,
} from '../utils/storage';
import { formatCurrency } from '../utils/formatCurrency';
import { getCurrentUserLimits } from '../utils/superAdminStorage';
import { isPlanLimitError, PLAN_LIMIT_REACHED_TOOLTIP } from '../utils/limits';
import { Tooltip } from '../components/Tooltip';

const ITEMS_PER_PAGE = 10;

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
	const [currentPage, setCurrentPage] = useState(1);
	const [totalBudgets, setTotalBudgets] = useState(0);
	const [budgetsThisMonth, setBudgetsThisMonth] = useState(0);
	const [hasNextPage, setHasNextPage] = useState(false);
	const pageCursorsRef = useRef<BudgetsPageCursor[]>([null]);

	const loadBudgets = useCallback(async (page = 1) => {
		try {
			setLoading(true);
			const [limits, loadedTotalBudgets, loadedBudgetsThisMonth] = await Promise.all([
				getCurrentUserLimits(),
				getBudgetsCount(),
				getBudgetsCreatedThisMonthCount(),
			]);
			const safePage = Math.min(page, Math.max(1, Math.ceil(loadedTotalBudgets / ITEMS_PER_PAGE)));
			const pageCursor = pageCursorsRef.current[safePage - 1] ?? null;
			const loadedPage = await getBudgetsPage({
				pageSize: ITEMS_PER_PAGE,
				cursor: pageCursor,
			});

			setBudgets(loadedPage.budgets);
			setHasNextPage(loadedPage.hasMore);
			setCurrentPage(safePage);
			setTotalBudgets(loadedTotalBudgets);
			setBudgetsThisMonth(loadedBudgetsThisMonth);
			setBudgetLimit(limits.budgetsPerMonth);

			if (loadedPage.hasMore && loadedPage.nextCursor) {
				pageCursorsRef.current[safePage] = loadedPage.nextCursor;
			} else {
				pageCursorsRef.current = pageCursorsRef.current.slice(0, safePage);
			}
		} catch (error) {
			console.error('Error loading budgets:', error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadBudgets();
	}, [loadBudgets]);

	const createBudgetDisabled = budgetsThisMonth >= budgetLimit;
	const totalPages = Math.max(1, Math.ceil(totalBudgets / ITEMS_PER_PAGE));
	const rangeStart = totalBudgets > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
	const rangeEnd = rangeStart > 0 ? rangeStart + budgets.length - 1 : 0;

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
			const nextTotal = Math.max(0, totalBudgets - 1);
			const nextPage = Math.min(currentPage, Math.max(1, Math.ceil(nextTotal / ITEMS_PER_PAGE)));
			if (nextPage === 1) {
				pageCursorsRef.current = [null];
			}
			loadBudgets(nextPage);
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
			) : totalBudgets === 0 ? (
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

					{totalBudgets > ITEMS_PER_PAGE && (
						<div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<p className="text-sm text-white/80">
								Showing {rangeStart}-{rangeEnd} of {totalBudgets}
							</p>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => {
										const previousPage = Math.max(1, currentPage - 1);
										loadBudgets(previousPage);
									}}
									disabled={currentPage === 1}
									className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50"
								>
									Previous
								</button>
								<span className="text-sm font-semibold text-white/90">
									Page {currentPage} of {totalPages}
								</span>
								<button
									type="button"
									onClick={() => {
										if (hasNextPage) {
											loadBudgets(currentPage + 1);
										}
									}}
									disabled={!hasNextPage}
									className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50"
								>
									Next
								</button>
							</div>
						</div>
					)}
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
