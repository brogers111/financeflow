'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  CREATE_BUDGET_LINE_ITEM,
  UPDATE_BUDGET_LINE_ITEM,
  DELETE_BUDGET_LINE_ITEM
} from '@/lib/graphql/budget-queries';
import { GET_CATEGORIES } from '@/lib/graphql/queries';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Interfaces
interface BudgetLineItem {
  id: string;
  description: string;
  budgetAmount: number;
  actualAmount: number;
  manualOverride: number | null;
  displayAmount: number;
  balance: number;
  isManuallyOverridden: boolean;
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: string;
  } | null;
}

interface Budget {
  id: string;
  startDate: string;
  endDate: string;
  totalBudgeted: number;
  totalActual: number;
  totalBalance: number;
  lineItems: BudgetLineItem[];
}

interface Props {
  budget: Budget;
  onRefresh: () => void;
}

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#AAB7B8'
];

// Main Component
export default function BudgetView({ budget, onRefresh }: Props) {
  const [showAddLineItem, setShowAddLineItem] = useState(false);

  const { data: categoriesData } = useQuery(GET_CATEGORIES);
  const categories = categoriesData?.categories || [];

  const [createLineItem] = useMutation(CREATE_BUDGET_LINE_ITEM);
  const [updateLineItem] = useMutation(UPDATE_BUDGET_LINE_ITEM);
  const [deleteLineItem] = useMutation(DELETE_BUDGET_LINE_ITEM);

  const dateRange = useMemo(() => {
    const start = new Date(budget.startDate);
    const end = new Date(budget.endDate);

    return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${end.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })}`;
  }, [budget]);

  // GRAPH DATA
  const budgetVsActualData = useMemo(() => {
    return budget.lineItems.map(item => ({
      category: item.category?.name || 'Uncategorized',
      budgeted: item.budgetAmount,
      actual: item.displayAmount,
      color: item.category?.color || '#666'
    }));
  }, [budget.lineItems]);

  const overUnderData = useMemo(() => {
    return budget.lineItems
      .map(item => ({
        category: item.category?.name || 'Uncategorized',
        balance: item.balance,
        color: item.category?.color || '#666'
      }))
      .sort((a, b) => a.balance - b.balance);
  }, [budget.lineItems]);

  const spendDistributionData = useMemo(() => {
    return budget.lineItems
      .filter(item => item.displayAmount > 0)
      .map(item => ({
        name: item.category?.name || 'Uncategorized',
        value: item.displayAmount,
        color: item.category?.color || '#666'
      }))
      .sort((a, b) => b.value - a.value);
  }, [budget.lineItems]);

  const totalSpent = spendDistributionData.reduce((sum, item) => sum + item.value, 0);

  // TOOLTIP COMPONENTS
  const BudgetVsActualTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;
    const data = payload[0].payload;

    return (
      <div className="bg-[#EEEBD9] px-3 py-2 border border-[#282427] rounded shadow-lg">
        <p className="text-sm font-semibold mb-1">{data.category}</p>

        <div className="text-xs space-y-1">
          <div className="flex justify-between gap-4">
            <span>Budgeted:</span>
            <span className="font-semibold">${data.budgeted.toLocaleString()}</span>
          </div>

          <div className="flex justify-between gap-4">
            <span>Actual:</span>
            <span className="font-semibold">${data.actual.toLocaleString()}</span>
          </div>

          <div
            className={`flex justify-between gap-4 font-bold ${
              data.budgeted - data.actual >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            <span>Difference:</span>
            <span>
              {data.budgeted - data.actual >= 0 ? '+' : ''}
              ${(data.budgeted - data.actual).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const OverUnderTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;
    const data = payload[0].payload;
    const isOver = data.balance < 0;

    return (
      <div className="bg-[#EEEBD9] px-3 py-2 border border-[#282427] rounded shadow-lg">
        <p className="text-sm font-semibold mb-1">{data.category}</p>
        <p className={`text-sm font-bold ${isOver ? 'text-red-600' : 'text-green-600'}`}>
          {isOver ? 'Over' : 'Under'} Budget: ${Math.abs(data.balance).toLocaleString()}
        </p>
      </div>
    );
  };

  // MUTATION HANDLERS
  const handleAddLineItem = async (categoryId: string, description: string, budgetAmount: number) => {
    await createLineItem({
      variables: {
        budgetPeriodId: budget.id,
        input: {
          categoryId,
          description,
          budgetAmount
        }
      }
    });

    onRefresh();
    setShowAddLineItem(false);
  };

  const handleUpdateLineItem = async (id: string, field: string, value: any) => {
    await updateLineItem({
      variables: {
        id,
        input: { [field]: value }
      }
    });

    onRefresh();
  };

  const handleDeleteLineItem = async (id: string) => {
    if (!confirm('Delete this line item?')) return;

    await deleteLineItem({ variables: { id } });
    onRefresh();
  };

  // MAIN RENDER
  return (
    <div className="p-6">

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#EEEBD9] mb-2">Budget</h1>
        <p className="text-lg text-[#EEEBD9]">{dateRange}</p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#EEEBD9] p-4 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Total Budgeted</p>
          <p className="text-2xl font-bold">${budget.totalBudgeted.toLocaleString()}</p>
        </div>

        <div className="bg-[#EEEBD9] p-4 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Total Actual</p>
          <p className="text-2xl font-bold">${budget.totalActual.toLocaleString()}</p>
        </div>

        <div className="bg-[#EEEBD9] p-4 rounded-lg">
          <p className={`text-xs text-gray-500 mb-1`}>Balance</p>
          <p className={`text-2xl font-bold ${budget.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {budget.totalBalance >= 0 ? '+' : ''}${budget.totalBalance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* GRAPHS */}
      <div className="grid grid-cols-3 gap-4 mb-6">

        {/* Graph 1 — Budget vs Actual */}
        <div className="bg-[#EEEBD9] rounded-lg p-4">
          <h3 className="text-md font-semibold mb-3">Budget vs Actual</h3>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={budgetVsActualData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<BudgetVsActualTooltip />} />
              <Bar dataKey="budgeted" fill="#4ECDC4" />
              <Bar dataKey="actual" fill="#FF6B6B" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Graph 2 — Over/Under */}
        <div className="bg-[#EEEBD9] rounded-lg p-4">
          <h3 className="text-md font-semibold mb-3">Over/Under Budget</h3>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={overUnderData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={100} />
              <Tooltip content={<OverUnderTooltip />} />
              <Bar dataKey="balance">
                {overUnderData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.balance >= 0 ? '#10B981' : '#EF4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Graph 3 — Spend Distribution */}
        <div className="bg-[#EEEBD9] rounded-lg p-4">
          <h3 className="text-md font-semibold mb-3">Spend Distribution</h3>

          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={spendDistributionData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                dataKey="value"
              >
                {spendDistributionData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>

              <Tooltip
                formatter={(value: any) => `$${value.toLocaleString()}`}
                contentStyle={{
                  backgroundColor: '#EEEBD9',
                  border: '1px solid #282427',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />

              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontSize: 12, fontWeight: 700 }}
              >
                ${totalSpent.toLocaleString()}
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LINE ITEMS TABLE */}
      <div className="bg-[#EEEBD9] rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Line Items</h3>

          <button
            onClick={() => setShowAddLineItem(true)}
            className="bg-[#282427] text-[#EEEBD9] px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer hover:bg-[#3a3537]"
          >
            + Add Line Item
          </button>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-[#282427]">
              <th className="text-left py-2 text-sm font-semibold">Category</th>
              <th className="text-left py-2 text-sm font-semibold">Description</th>
              <th className="text-right py-2 text-sm font-semibold">Budget</th>
              <th className="text-right py-2 text-sm font-semibold">Actual</th>
              <th className="text-right py-2 text-sm font-semibold">Balance</th>
              <th className="text-center py-2 text-sm font-semibold w-16">Actions</th>
            </tr>
          </thead>

          <tbody>
            {budget.lineItems.map(item => (
              <LineItemRow
                key={item.id}
                item={item}
                categories={categories}
                onUpdate={(field, value) => handleUpdateLineItem(item.id, field, value)}
                onDelete={() => handleDeleteLineItem(item.id)}
              />
            ))}
          </tbody>
        </table>

        {budget.lineItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No line items yet. Click “Add Line Item” to get started.
          </div>
        )}
      </div>

      {showAddLineItem && (
        <AddLineItemModal
          categories={categories}
          onAdd={handleAddLineItem}
          onClose={() => setShowAddLineItem(false)}
        />
      )}
    </div>
  );
}

// LINE ITEM ROW
function LineItemRow({ item, categories, onUpdate, onDelete }: any) {
  const [editMode, setEditMode] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<any>(null);

  const handleSave = (field: string) => {
    onUpdate(field, tempValue);
    setEditMode(null);
    setTempValue(null);
  };

  const handleCancel = () => {
    setEditMode(null);
    setTempValue(null);
  };

  return (
    <tr className="border-b border-gray-300 hover:bg-[#d7d5c5]">

      {/* CATEGORY */}
      <td className="py-3">
        {item.category ? (
          <span className="flex items-center gap-2">
            <span>{item.category.icon}</span>
            <span>{item.category.name}</span>
          </span>
        ) : (
          <span className="text-gray-500">Uncategorized</span>
        )}
      </td>

      {/* DESCRIPTION */}
      <td className="py-3">
        {editMode === 'description' ? (
          <input
            type="text"
            value={tempValue}
            onChange={e => setTempValue(e.target.value)}
            onBlur={() => handleSave('description')}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave('description');
              if (e.key === 'Escape') handleCancel();
            }}
            className="w-full p-1 border border-[#282427] rounded"
            autoFocus
          />
        ) : (
          <span
            onClick={() => {
              setEditMode('description');
              setTempValue(item.description);
            }}
            className="cursor-pointer hover:underline"
          >
            {item.description}
          </span>
        )}
      </td>

      {/* BUDGET AMOUNT */}
      <td className="py-3 text-right">
        {editMode === 'budgetAmount' ? (
          <input
            type="number"
            step="0.01"
            value={tempValue}
            onChange={e => setTempValue(parseFloat(e.target.value))}
            onBlur={() => handleSave('budgetAmount')}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave('budgetAmount');
              if (e.key === 'Escape') handleCancel();
            }}
            className="w-24 p-1 border border-[#282427] rounded text-right ml-auto"
            autoFocus
          />
        ) : (
          <span
            onClick={() => {
              setEditMode('budgetAmount');
              setTempValue(item.budgetAmount);
            }}
            className="cursor-pointer hover:underline"
          >
            ${item.budgetAmount.toLocaleString()}
          </span>
        )}
      </td>

      {/* ACTUAL AMOUNT / MANUAL OVERRIDE */}
      <td className="py-3 text-right">
        {editMode === 'manualOverride' ? (
          <input
            type="number"
            step="0.01"
            value={tempValue ?? ''}
            onChange={e => setTempValue(parseFloat(e.target.value) || null)}
            onBlur={() => handleSave('manualOverride')}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave('manualOverride');
              if (e.key === 'Escape') handleCancel();
            }}
            className={`w-24 p-1 rounded text-right ml-auto ${
              item.isManuallyOverridden
                ? 'border-2 border-orange-500 bg-orange-50'
                : 'border border-[#282427]'
            }`}
            autoFocus
          />
        ) : (
          <span
            onClick={() => {
              setEditMode('manualOverride');
              setTempValue(item.manualOverride ?? item.actualAmount);
            }}
            className={`cursor-pointer hover:underline inline-block px-2 py-1 rounded ${
              item.isManuallyOverridden
                ? 'border-2 border-orange-500 bg-orange-50'
                : ''
            }`}
          >
            ${item.displayAmount.toLocaleString()}
          </span>
        )}
      </td>

      {/* BALANCE */}
      <td
        className={`py-3 text-right font-semibold ${
          item.balance >= 0 ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {item.balance >= 0 ? '+' : ''}${item.balance.toLocaleString()}
      </td>

      {/* ACTIONS */}
      <td className="py-3 text-center">
        <button
          onClick={onDelete}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          🗑️
        </button>
      </td>
    </tr>
  );
}

// ADD LINE ITEM MODAL
function AddLineItemModal({ categories, onAdd, onClose }: any) {
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');

  const handleSubmit = () => {
    if (!description || !budgetAmount) {
      alert('Please fill in all fields');
      return;
    }

    onAdd(categoryId || null, description, parseFloat(budgetAmount));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#EEEBD9] rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">Add Line Item</h3>

        <div className="space-y-4 mb-6">

          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full p-2 border border-[#282427] rounded-lg"
            >
              <option value="">Uncategorized</option>

              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description *</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full p-2 border border-[#282427] rounded-lg"
              placeholder="e.g., Groceries, Rent, Gas"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Budget Amount *</label>
            <input
              type="number"
              step="0.01"
              value={budgetAmount}
              onChange={e => setBudgetAmount(e.target.value)}
              className="w-full p-2 border border-[#282427] rounded-lg"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-[#282427] py-2 px-4 rounded-lg font-semibold hover:bg-gray-400"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            className="flex-1 bg-[#282427] text-[#EEEBD9] py-2 px-4 rounded-lg font-semibold hover:bg-[#3a3537]"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
