import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Budget, BudgetLineItem } from '../types/budget';
import { getBudget, updateBudget } from '../utils/storage';

export const BudgetView = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [budget, setBudget] = useState<Budget | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingStartingAmount, setEditingStartingAmount] = useState(false);
	const [startingAmountValue, setStartingAmountValue] = useState('0');
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadBudget = async () => {
			if (!id) return;

			const loadedBudget = await getBudget(id);
			if (!loadedBudget) {
				navigate('/budgets');
				return;
			}

			// Update state with loaded budget data
			setBudget(loadedBudget);
			setStartingAmountValue(loadedBudget.startingAmount.toString());
			setLoading(false);
		};

		loadBudget();
	}, [id, navigate]);

	const handleAddAdHoc = async () => {
		if (!budget) return;

		const newItem: BudgetLineItem = {
			id: crypto.randomUUID(),
			status: 'incomplete',
			name: 'New Item',
			amount: 0,
			isRecurring: false,
			isMarked: false,
		};

		const updatedBudget = {
			...budget,
			lineItems: [...budget.lineItems, newItem],
		};

		await updateBudget(updatedBudget);
		setBudget(updatedBudget);
		setEditingId(newItem.id);
	};

	const handleDeleteItem = async (itemId: string) => {
		if (!budget) return;

		const updatedBudget = {
			...budget,
			lineItems: budget.lineItems.filter(item => item.id !== itemId),
		};

		await updateBudget(updatedBudget);
		setBudget(updatedBudget);
	};

	const handleUpdateItem = async (itemId: string, updates: Partial<BudgetLineItem>) => {
		if (!budget) return;

		const updatedBudget = {
			...budget,
			lineItems: budget.lineItems.map(item =>
				item.id === itemId ? { ...item, ...updates } : item
			),
		};

		await updateBudget(updatedBudget);
		setBudget(updatedBudget);
	};

	const handleReorderItems = async (dragIndex: number, dropIndex: number) => {
		if (!budget) return;

		const items = [...budget.lineItems];
		const [draggedItem] = items.splice(dragIndex, 1);
		items.splice(dropIndex, 0, draggedItem);

		const updatedBudget = {
			...budget,
			lineItems: items,
		};

		await updateBudget(updatedBudget);
		setBudget(updatedBudget);
	};

	const handleUpdateStartingAmount = async () => {
		if (!budget) return;

		const amount = parseFloat(startingAmountValue);
		if (isNaN(amount)) {
			alert('Please enter a valid amount');
			return;
		}

		const updatedBudget = {
			...budget,
			startingAmount: amount,
		};

		await updateBudget(updatedBudget);
		setBudget(updatedBudget);
		setEditingStartingAmount(false);
	};

	const calculateTotals = () => {
		if (!budget) return { unmarkedTotal: 0, finalTotal: 0 };

		// Sum of unmarked items (negative amounts are deductions, positive are additions)
		const unmarkedTotal = budget.lineItems
			.filter(item => !item.isMarked)
			.reduce((sum, item) => sum + item.amount, 0);

		// Sum of all items
		const allItemsTotal = budget.lineItems.reduce((sum, item) => sum + item.amount, 0);

		return {
			unmarkedTotal: budget.startingAmount + unmarkedTotal,
			finalTotal: budget.startingAmount + allItemsTotal,
		};
	};

	if (loading || !budget) {
		return (
			<div className="mx-auto max-w-6xl p-6">
				<div className="rounded-lg border border-gray-700 bg-gray-800 p-8 text-center">
					<p className="text-gray-400">Loading budget...</p>
				</div>
			</div>
		);
	}

	const totals = calculateTotals();

	return (
		<div className="mx-auto max-w-6xl p-6">
			<div className="mb-6">
				<Link to="/budgets" className="text-blue-400 hover:text-blue-300">
					← Back to Budgets
				</Link>
			</div>

			<div className="mb-6">
				<h1 className="text-3xl font-bold">{budget.name}</h1>
				<p className="text-gray-400">
					Created: {new Date(budget.dateCreated).toLocaleDateString()}
				</p>
			</div>

			{/* Starting Amount */}
			<div className="mb-6 rounded-lg border border-gray-700 bg-gray-800 p-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-sm font-medium text-gray-400">Starting Amount</h2>
						{editingStartingAmount ? (
							<div className="mt-1 flex items-center gap-2">
								<input
									type="number"
									step="0.01"
									value={startingAmountValue}
									onChange={(e) => setStartingAmountValue(e.target.value)}
									className="w-32 rounded border border-gray-600 bg-gray-700 px-2 py-1 text-white"
									autoFocus
								/>
								<button
									type="button"
									onClick={handleUpdateStartingAmount}
									className="rounded bg-green-600 px-2 py-1 text-sm text-white hover:bg-green-700"
								>
									Save
								</button>
								<button
									type="button"
									onClick={() => {
										setEditingStartingAmount(false);
										setStartingAmountValue(budget.startingAmount.toString());
									}}
									className="rounded bg-gray-600 px-2 py-1 text-sm text-white hover:bg-gray-700"
								>
									Cancel
								</button>
							</div>
						) : (
							<p className="mt-1 text-2xl font-bold">${budget.startingAmount.toFixed(2)}</p>
						)}
					</div>
					{!editingStartingAmount && (
						<button
							type="button"
							onClick={() => setEditingStartingAmount(true)}
							className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
						>
							Edit
						</button>
					)}
				</div>
			</div>

			{/* Action Buttons */}
			<div className="mb-4 flex gap-2">
				<button
					type="button"
					onClick={handleAddAdHoc}
					className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
				>
					Add Ad-hoc Item
				</button>
			</div>

			{/* Line Items Table */}
			<div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-800">
				<table className="w-full">
					<thead className="border-b border-gray-700 bg-gray-750">
						<tr>
							<th className="px-2 py-3 text-left text-sm font-medium w-8"></th>
							<th className={`px-4 py-3 text-left text-sm font-medium ${editingId ? '' : 'w-0 p-0 overflow-hidden'}`}>
								{editingId && 'Marked'}
							</th>
							<th className="px-4 py-3 text-left text-sm font-medium">Status</th>
							<th className="px-4 py-3 text-left text-sm font-medium">Name</th>
							<th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
							<th className="px-4 py-3 text-left text-sm font-medium">Link</th>
							<th className="px-4 py-3 text-left text-sm font-medium">Note</th>
							<th className="px-4 py-3 text-left text-sm font-medium">Type</th>
							<th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
						</tr>
					</thead>
					<tbody>
						{budget.lineItems.length === 0 ? (
							<tr>
								<td colSpan={9} className="px-4 py-8 text-center text-gray-400">
									No items yet. Recurring expenses are added automatically when you create a budget. Add ad-hoc items as needed.
								</td>
							</tr>
						) : (
							budget.lineItems.map((item, index) => (
								<LineItemRow
									key={item.id}
									item={item}
									index={index}
									isEditing={editingId === item.id}
									onEdit={() => setEditingId(item.id)}
									onSave={() => setEditingId(null)}
									onUpdate={handleUpdateItem}
									onDelete={handleDeleteItem}
									onReorder={handleReorderItems}
								/>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Totals */}
			<div className="mt-6 rounded-lg border border-gray-700 bg-gray-800 p-4">
				<h2 className="mb-3 text-xl font-bold">Totals</h2>
				<div className="space-y-2">
					<div className="flex justify-between">
						<span className="text-gray-400">After Unmarked Items:</span>
						<span className="text-xl font-semibold">${totals.unmarkedTotal.toFixed(2)}</span>
					</div>
					<div className="flex justify-between border-t border-gray-700 pt-2">
						<span className="text-gray-400">Final Total (After All Items):</span>
						<span className="text-2xl font-bold">${totals.finalTotal.toFixed(2)}</span>
					</div>
				</div>
			</div>
		</div>
	);
};

interface LineItemRowProps {
	item: BudgetLineItem;
	index: number;
	isEditing: boolean;
	onEdit: () => void;
	onSave: () => void;
	onUpdate: (id: string, updates: Partial<BudgetLineItem>) => void;
	onDelete: (id: string) => void;
	onReorder: (dragIndex: number, dropIndex: number) => void;
}

const LineItemRow = ({ item, index, isEditing, onEdit, onSave, onUpdate, onDelete, onReorder }: LineItemRowProps) => {
	const [editValues, setEditValues] = useState({
		status: item.status,
		name: item.name,
		amount: item.amount.toString(),
		link: item.link || '',
		note: item.note || '',
	});
	const [inlineAmount, setInlineAmount] = useState(item.amount.toString());
	const [editingField, setEditingField] = useState<'status' | 'amount' | null>(null);
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

		onUpdate(item.id, {
			status: editValues.status,
			name: editValues.name,
			amount,
			link: editValues.link || undefined,
			note: editValues.note || undefined,
		});
		onSave();
	};

	const handleStatusChange = (newStatus: 'incomplete' | 'complete' | 'automatic') => {
		onUpdate(item.id, { status: newStatus });
	};

	const handleInlineAmountChange = (newAmount: string) => {
		setInlineAmount(newAmount);
	};

	const handleInlineAmountBlur = () => {
		const amount = parseFloat(inlineAmount);
		if (!isNaN(amount)) {
			onUpdate(item.id, { amount });
		} else {
			// Reset to original value if invalid
			setInlineAmount(item.amount.toString());
		}
	};

	if (isEditing) {
		const isDimmed = item.status === 'automatic' || item.status === 'complete' || item.amount === 0;
		const isIncompleteNegative = item.status === 'incomplete' && item.amount < 0;
		const isPositive = item.amount > 0;
		const bgClass = isIncompleteNegative ? 'bg-red-900/20' : isPositive ? 'bg-green-900/20' : 'bg-gray-750';
		return (
			<tr
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				className={`border-b border-gray-700 ${isDimmed ? 'opacity-50' : ''} ${bgClass} ${dragOver ? 'border-t-4 border-t-blue-500' : ''}`}
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
						type="checkbox"
						checked={item.isMarked}
						onChange={(e) => onUpdate(item.id, { isMarked: e.target.checked })}
						className="h-4 w-4"
					/>
				</td>
				<td className="px-4 py-2">
					<select
						value={editValues.status}
						onChange={(e) => setEditValues({ ...editValues, status: e.target.value as 'incomplete' | 'complete' | 'automatic' })}
						className="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-white"
					>
						<option value="incomplete">Incomplete</option>
						<option value="complete">Complete</option>
						<option value="automatic">Automatic</option>
					</select>
				</td>
				<td className="px-4 py-2">
					<input
						type="text"
						value={editValues.name}
						onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
						className="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-white"
					/>
				</td>
				<td className="px-4 py-2">
					<input
						type="text"
						inputMode="decimal"
						value={editValues.amount}
						onChange={(e) => setEditValues({ ...editValues, amount: e.target.value })}
						className="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-white"
						placeholder="0.00"
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
					<span className="text-xs text-gray-400">{item.isRecurring ? 'Recurring' : 'Ad-hoc'}</span>
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
									status: item.status,
									name: item.name,
									amount: item.amount.toString(),
									link: item.link || '',
									note: item.note || '',
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

	const isDimmed = item.status === 'automatic' || item.status === 'complete' || item.amount === 0;
	const isIncompleteNegative = item.status === 'incomplete' && item.amount < 0;
	const isPositive = item.amount > 0;
	const bgClass = isIncompleteNegative ? 'bg-red-900/20 hover:bg-red-900/30' : isPositive ? 'bg-green-900/20 hover:bg-green-900/30' : 'hover:bg-gray-750';

	const statusDisplay = item.status.charAt(0).toUpperCase() + item.status.slice(1);

	return (
		<tr
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			className={`border-b border-gray-700 ${isDimmed ? 'opacity-50' : ''} ${bgClass} ${dragOver ? 'border-t-4 border-t-blue-500' : ''}`}
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
			<td className="w-0 p-0 overflow-hidden">
				{/* Marked checkbox only visible when editing */}
			</td>
			<td className="px-4 py-2">
				{editingField === 'status' ? (
					<select
						value={item.status}
						onChange={(e) => {
							handleStatusChange(e.target.value as 'incomplete' | 'complete' | 'automatic');
							setEditingField(null);
						}}
						onBlur={() => setEditingField(null)}
						autoFocus
						className="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1 text-xs text-white"
					>
						<option value="incomplete">Incomplete</option>
						<option value="complete">Complete</option>
						<option value="automatic">Automatic</option>
					</select>
				) : (
					<span
						onClick={() => setEditingField('status')}
						className="cursor-pointer hover:text-blue-400"
					>
						{statusDisplay}
					</span>
				)}
			</td>
			<td className="px-4 py-2">{item.name}</td>
			<td className="px-4 py-2 font-medium">
				{editingField === 'amount' ? (
					<input
						type="text"
						inputMode="decimal"
						value={inlineAmount}
						onChange={(e) => handleInlineAmountChange(e.target.value)}
						onBlur={() => {
							handleInlineAmountBlur();
							setEditingField(null);
						}}
						autoFocus
						className="w-24 rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-white"
						placeholder="0.00"
					/>
				) : (
					<span
						onClick={() => {
							setInlineAmount(item.amount.toString());
							setEditingField('amount');
						}}
						className="cursor-pointer hover:text-blue-400"
					>
						${item.amount.toFixed(2)}
					</span>
				)}
			</td>
			<td className="px-4 py-2">
				{item.link ? (
					<a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
						Link
					</a>
				) : (
					<span className="text-gray-600">—</span>
				)}
			</td>
			<td className="px-4 py-2 text-sm text-gray-400">{item.note || '—'}</td>
			<td className="px-4 py-2">
				<span className="text-xs text-gray-400">{item.isRecurring ? 'Recurring' : 'Ad-hoc'}</span>
			</td>
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
						onClick={() => onDelete(item.id)}
						className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
					>
						Delete
					</button>
				</div>
			</td>
		</tr>
	);
};
