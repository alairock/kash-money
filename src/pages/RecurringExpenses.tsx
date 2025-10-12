import { useState, useEffect, useCallback } from 'react';
import type { RecurringExpense } from '../types/budget';
import {
	getRecurringExpenses,
	createRecurringExpense,
	updateRecurringExpense,
	deleteRecurringExpense,
} from '../utils/storage';
import { formatCurrency } from '../utils/formatCurrency';

export const RecurringExpenses = () => {
	const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	const loadExpenses = useCallback(async () => {
		try {
			const loadedExpenses = await getRecurringExpenses();

			// Migrate any expenses without order field
			let needsUpdate = false;
			const migratedExpenses = loadedExpenses.map((expense, index) => {
				if (expense.order === undefined) {
					needsUpdate = true;
					return { ...expense, order: index };
				}
				return expense;
			});

			// Save migrated expenses back to storage
			if (needsUpdate) {
				for (const expense of migratedExpenses) {
					await updateRecurringExpense(expense);
				}
			}

			setExpenses(migratedExpenses);
		} catch (error) {
			console.error('Error loading expenses:', error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadExpenses();
	}, [loadExpenses]);

	const handleAddExpense = async () => {
		const newExpense: RecurringExpense = {
			id: crypto.randomUUID(),
			name: 'New Expense',
			amount: 0,
			isAutomatic: false,
			order: expenses.length, // Add to end
		};

		await createRecurringExpense(newExpense);
		setExpenses([...expenses, newExpense]);
		setEditingId(newExpense.id);
		setNewlyCreatedId(newExpense.id); // Mark this as newly created
	};

	const handleUpdateExpense = async (id: string, updates: Partial<RecurringExpense>) => {
		const expense = expenses.find(e => e.id === id);
		if (expense) {
			const updated = { ...expense, ...updates };
			await updateRecurringExpense(updated);
			setExpenses(expenses.map(e => (e.id === id ? updated : e)));
		}
	};

	const handleDeleteExpense = async (id: string) => {
		if (confirm('Are you sure you want to delete this recurring expense?')) {
			await deleteRecurringExpense(id);
			setExpenses(expenses.filter(e => e.id !== id));
		}
	};

	const handleCancelEdit = async (id: string) => {
		// If this is a newly created expense that hasn't been saved yet, delete it
		if (id === newlyCreatedId) {
			await deleteRecurringExpense(id);
			setExpenses(expenses.filter(e => e.id !== id));
			setNewlyCreatedId(null);
		}
		// Close editing mode
		setEditingId(null);
	};

	const handleSaveEdit = () => {
		// Clear the newly created flag when saving
		setNewlyCreatedId(null);
		setEditingId(null);
	};

	const handleReorderExpenses = async (dragIndex: number, dropIndex: number) => {
		const items = [...expenses];
		const [draggedItem] = items.splice(dragIndex, 1);
		items.splice(dropIndex, 0, draggedItem);

		// Update order property for all items based on their new position
		const updatedItems = items.map((item, index) => ({
			...item,
			order: index,
		}));

		setExpenses(updatedItems);

		// Save the new order to Firebase
		for (const expense of updatedItems) {
			await updateRecurringExpense(expense);
		}
	};

	return (
		<div className="mx-auto max-w-6xl p-6">
			<div className="mb-8 flex items-center justify-between">
				<h1 className="text-4xl font-black text-shadow-glow">💸 Recurring Expenses</h1>
				<button
					type="button"
					onClick={handleAddExpense}
					className="gradient-success rounded-xl px-6 py-3 font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-2xl"
				>
					➕ Add Recurring Expense
				</button>
			</div>

			<div className="glass-effect rounded-2xl p-6 shadow-xl">
				<h2 className="mb-4 text-2xl font-bold">💸 Recurring Bills/Expenses</h2>
				<p className="mb-6 text-sm text-white/80">
					These expenses will be copied into new budgets. You can edit the values in individual budgets without
					affecting these defaults.
				</p>

				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="border-b-2 border-white/20">
							<tr>
								<th className="px-2 py-3 text-left text-sm font-bold w-8"></th>
								<th className="px-4 py-3 text-left text-sm font-bold">Name</th>
								<th className="px-4 py-3 text-left text-sm font-bold">Estimated Amount</th>
								<th className="px-4 py-3 text-left text-sm font-bold">Automatic</th>
								<th className="px-4 py-3 text-left text-sm font-bold">Link</th>
								<th className="px-4 py-3 text-left text-sm font-bold">Note</th>
								<th className="px-4 py-3 text-left text-sm font-bold">Actions</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td colSpan={7} className="px-4 py-8 text-center text-white/70">
										Loading expenses...
									</td>
								</tr>
							) : expenses.length === 0 ? (
								<tr>
									<td colSpan={7} className="px-4 py-8 text-center text-white/70">
										No recurring expenses yet. Add one to get started! 🚀
									</td>
								</tr>
							) : (
								expenses.map((expense, index) => (
									<RecurringExpenseRow
										key={expense.id}
										expense={expense}
										index={index}
										isEditing={editingId === expense.id}
										onEdit={() => setEditingId(expense.id)}
										onSave={handleSaveEdit}
										onCancel={() => handleCancelEdit(expense.id)}
										onUpdate={handleUpdateExpense}
										onDelete={handleDeleteExpense}
										onReorder={handleReorderExpenses}
									/>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};

interface RecurringExpenseRowProps {
	expense: RecurringExpense;
	index: number;
	isEditing: boolean;
	onEdit: () => void;
	onSave: () => void;
	onCancel: () => void;
	onUpdate: (id: string, updates: Partial<RecurringExpense>) => void;
	onDelete: (id: string) => void;
	onReorder: (dragIndex: number, dropIndex: number) => void;
}

const RecurringExpenseRow = ({
	expense,
	index,
	isEditing,
	onEdit,
	onSave,
	onCancel,
	onUpdate,
	onDelete,
	onReorder,
}: RecurringExpenseRowProps) => {
	const [editValues, setEditValues] = useState({
		name: expense.name,
		amount: expense.amount.toString(),
		link: expense.link || '',
		note: expense.note || '',
		isAutomatic: expense.isAutomatic || false,
	});
	const [dragOver, setDragOver] = useState<'top' | 'bottom' | null>(null);
	const [isDragging, setIsDragging] = useState(false);

	const handleDragStart = (e: React.DragEvent) => {
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', index.toString());
		setIsDragging(true);
		// Add a custom drag image to make it more obvious
		const dragImage = (e.target as HTMLElement).closest('tr');
		if (dragImage) {
			e.dataTransfer.setDragImage(dragImage, 20, 20);
		}
	};

	const handleDragEnd = () => {
		setIsDragging(false);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';

		// Determine if dragging from above or below based on the source index
		const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));

		// If dragging from above (smaller index), show indicator at bottom
		// If dragging from below (larger index), show indicator at top
		if (dragIndex < index) {
			setDragOver('bottom');
		} else if (dragIndex > index) {
			setDragOver('top');
		}
	};

	const handleDragLeave = () => {
		setDragOver(null);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setDragOver(null);
		const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
		if (dragIndex !== index) {
			onReorder(dragIndex, index);
		}
	};

	const handleSave = () => {
		const amount = parseFloat(editValues.amount);
		if (isNaN(amount)) {
			alert('Please enter a valid amount');
			return;
		}

		if (!editValues.name.trim()) {
			alert('Please enter a name');
			return;
		}

		onUpdate(expense.id, {
			name: editValues.name,
			amount,
			link: editValues.link || '',
			note: editValues.note || '',
			isAutomatic: editValues.isAutomatic,
		});
		onSave();
	};

	if (isEditing) {
		return (
			<tr
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				onDragEnd={handleDragEnd}
				className={`border-b border-white/10 bg-white/10 backdrop-blur-sm transition-all ${isDragging ? 'opacity-40 scale-95' : ''
					} ${dragOver === 'top' ? 'border-t-4 border-t-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/50' : ''
					} ${dragOver === 'bottom' ? 'border-b-4 border-b-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/50' : ''
					}`}
			>
				<td className="px-2 py-2">
					<div
						draggable
						onDragStart={handleDragStart}
						className="cursor-move text-white/50 hover:text-white transition-colors"
						title="Drag to reorder"
					>
						<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
							<path d="M5 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm8-10a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
						</svg>
					</div>
				</td>
				<td className="px-4 py-2">
					<input
						type="text"
						value={editValues.name}
						onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
						className="w-full rounded-lg border-2 border-white/20 bg-white/10 px-3 py-2 text-sm text-white backdrop-blur-sm focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
						autoFocus
					/>
				</td>
				<td className="px-4 py-2">
					<input
						type="number"
						step="0.01"
						value={editValues.amount}
						onChange={(e) => setEditValues({ ...editValues, amount: e.target.value })}
						className="w-full rounded-lg border-2 border-white/20 bg-white/10 px-3 py-2 text-sm text-white backdrop-blur-sm focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
					/>
				</td>
				<td className="px-4 py-2">
					<input
						type="checkbox"
						checked={editValues.isAutomatic}
						onChange={(e) => setEditValues({ ...editValues, isAutomatic: e.target.checked })}
						className="h-4 w-4"
					/>
				</td>
				<td className="px-4 py-2">
					<input
						type="text"
						value={editValues.link}
						onChange={(e) => setEditValues({ ...editValues, link: e.target.value })}
						className="w-full rounded-lg border-2 border-white/20 bg-white/10 px-3 py-2 text-sm text-white backdrop-blur-sm focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
						placeholder="http://..."
					/>
				</td>
				<td className="px-4 py-2">
					<input
						type="text"
						value={editValues.note}
						onChange={(e) => setEditValues({ ...editValues, note: e.target.value })}
						className="w-full rounded-lg border-2 border-white/20 bg-white/10 px-3 py-2 text-sm text-white backdrop-blur-sm focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
					/>
				</td>
				<td className="px-4 py-2">
					<div className="flex gap-1">
						<button
							type="button"
							onClick={handleSave}
							className="gradient-success rounded-lg px-3 py-1 text-xs font-bold text-white shadow-md transition-all hover:scale-105"
						>
							Save
						</button>
						<button
							type="button"
							onClick={() => {
								setEditValues({
									name: expense.name,
									amount: expense.amount.toString(),
									link: expense.link || '',
									note: expense.note || '',
									isAutomatic: expense.isAutomatic || false,
								});
								onCancel();
							}}
							className="rounded-lg bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm transition-all hover:bg-white/30"
						>
							Cancel
						</button>
					</div>
				</td>
			</tr>
		);
	}

	return (
		<tr
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			onDragEnd={handleDragEnd}
			className={`border-b border-white/10 transition-all hover:bg-white/5 ${isDragging ? 'opacity-40 scale-95' : ''
				} ${dragOver === 'top' ? 'border-t-4 border-t-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/50' : ''
				} ${dragOver === 'bottom' ? 'border-b-4 border-b-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/50' : ''
				}`}
		>
			<td className="px-2 py-2">
				<div
					draggable
					onDragStart={handleDragStart}
					className="cursor-move text-white/50 hover:text-white transition-colors"
					title="Drag to reorder"
				>
					<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
						<path d="M5 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm8-10a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
					</svg>
				</div>
			</td>
			<td className="px-4 py-2 font-semibold">{expense.name}</td>
			<td className={`px-4 py-2 font-bold ${expense.amount > 0
				? 'text-green-300'
				: expense.amount < 0
					? 'text-red-300'
					: 'text-white/80'
				}`}>
				{formatCurrency(expense.amount)}
			</td>
			<td className="px-4 py-2">
				<input
					type="checkbox"
					checked={expense.isAutomatic || false}
					onChange={(e) => onUpdate(expense.id, { isAutomatic: e.target.checked })}
					className="h-4 w-4"
				/>
			</td>
			<td className="px-4 py-2">
				{expense.link ? (
					<a href={expense.link} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:text-cyan-100 hover:underline">
						🔗 Link
					</a>
				) : (
					<span className="text-white/40">—</span>
				)}
			</td>
			<td className="px-4 py-2 text-sm text-white/80">{expense.note || '—'}</td>
			<td className="px-4 py-2">
				<div className="flex gap-1">
					<button
						type="button"
						onClick={onEdit}
						className="gradient-primary rounded-lg px-3 py-1 text-xs font-bold text-white shadow-md transition-all hover:scale-105"
					>
						Edit
					</button>
					<button
						type="button"
						onClick={() => onDelete(expense.id)}
						className="gradient-secondary rounded-lg px-3 py-1 text-xs font-bold text-white shadow-md transition-all hover:scale-105"
					>
						Delete
					</button>
				</div>
			</td>
		</tr>
	);
};
