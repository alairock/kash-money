import { useState, useEffect, useCallback } from 'react';
import type { RecurringExpense } from '../types/budget';
import {
	getRecurringExpenses,
	createRecurringExpense,
	updateRecurringExpense,
	deleteRecurringExpense,
} from '../utils/storage';

export const Config = () => {
	const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	const loadExpenses = useCallback(async () => {
		try {
			const loadedExpenses = await getRecurringExpenses();
			setExpenses(loadedExpenses);
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
		};

		await createRecurringExpense(newExpense);
		setExpenses([...expenses, newExpense]);
		setEditingId(newExpense.id);
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

	const handleReorderExpenses = async (dragIndex: number, dropIndex: number) => {
		const items = [...expenses];
		const [draggedItem] = items.splice(dragIndex, 1);
		items.splice(dropIndex, 0, draggedItem);

		setExpenses(items);
		// Update all expenses in storage to maintain order
		for (const expense of items) {
			await updateRecurringExpense(expense);
		}
	};

	return (
		<div className="mx-auto max-w-6xl p-6">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-3xl font-bold">Configuration</h1>
				<button
					type="button"
					onClick={handleAddExpense}
					className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
				>
					Add Recurring Expense
				</button>
			</div>

			<div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
				<h2 className="mb-4 text-xl font-semibold">Recurring Bills/Expenses</h2>
				<p className="mb-4 text-sm text-gray-400">
					These expenses will be copied into new budgets. You can edit the values in individual budgets without
					affecting these defaults.
				</p>

				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="border-b border-gray-700">
							<tr>
								<th className="px-2 py-3 text-left text-sm font-medium w-8"></th>
								<th className="px-4 py-3 text-left text-sm font-medium">Name</th>
								<th className="px-4 py-3 text-left text-sm font-medium">Estimated Amount</th>
								<th className="px-4 py-3 text-left text-sm font-medium">Automatic</th>
								<th className="px-4 py-3 text-left text-sm font-medium">Link</th>
								<th className="px-4 py-3 text-left text-sm font-medium">Note</th>
								<th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td colSpan={7} className="px-4 py-8 text-center text-gray-400">
										Loading expenses...
									</td>
								</tr>
							) : expenses.length === 0 ? (
								<tr>
									<td colSpan={7} className="px-4 py-8 text-center text-gray-400">
										No recurring expenses yet. Add one to get started!
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
										onSave={() => setEditingId(null)}
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
	const [dragOver, setDragOver] = useState(false);

	const handleDragStart = (e: React.DragEvent) => {
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', index.toString());
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		setDragOver(true);
	};

	const handleDragLeave = () => {
		setDragOver(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setDragOver(false);
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
			link: editValues.link || undefined,
			note: editValues.note || undefined,
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
				className={`border-b border-gray-700 bg-gray-750 ${dragOver ? 'border-t-4 border-t-blue-500' : ''}`}
			>
				<td className="px-2 py-2">
					<div
						draggable
						onDragStart={handleDragStart}
						className="cursor-move text-gray-400 hover:text-gray-200"
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
						className="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-white"
						autoFocus
					/>
				</td>
				<td className="px-4 py-2">
					<input
						type="number"
						step="0.01"
						value={editValues.amount}
						onChange={(e) => setEditValues({ ...editValues, amount: e.target.value })}
						className="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-white"
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
						className="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-white"
						placeholder="http://..."
					/>
				</td>
				<td className="px-4 py-2">
					<input
						type="text"
						value={editValues.note}
						onChange={(e) => setEditValues({ ...editValues, note: e.target.value })}
						className="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-white"
					/>
				</td>
				<td className="px-4 py-2">
					<div className="flex gap-1">
						<button
							type="button"
							onClick={handleSave}
							className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
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
								onSave();
							}}
							className="rounded bg-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-700"
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
			className={`border-b border-gray-700 hover:bg-gray-750 ${dragOver ? 'border-t-4 border-t-blue-500' : ''}`}
		>
			<td className="px-2 py-2">
				<div
					draggable
					onDragStart={handleDragStart}
					className="cursor-move text-gray-400 hover:text-gray-200"
					title="Drag to reorder"
				>
					<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
						<path d="M5 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm8-10a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
					</svg>
				</div>
			</td>
			<td className="px-4 py-2">{expense.name}</td>
			<td className="px-4 py-2 font-medium">${expense.amount.toFixed(2)}</td>
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
					<a href={expense.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
						Link
					</a>
				) : (
					<span className="text-gray-600">—</span>
				)}
			</td>
			<td className="px-4 py-2 text-sm text-gray-400">{expense.note || '—'}</td>
			<td className="px-4 py-2">
				<div className="flex gap-1">
					<button
						type="button"
						onClick={onEdit}
						className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
					>
						Edit
					</button>
					<button
						type="button"
						onClick={() => onDelete(expense.id)}
						className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
					>
						Delete
					</button>
				</div>
			</td>
		</tr>
	);
};
