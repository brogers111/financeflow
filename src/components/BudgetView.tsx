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
import Image from 'next/image';

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
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; description: string } | null>(null);

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

  // ========================================
  // CONSOLIDATED GRAPH DATA BY CATEGORY
  // ========================================
  const budgetVsActualData = useMemo(() => {
    const categoryTotals: Record<string, {
      category: string;
      budgeted: number;
      actual: number;
      color: string;
      icon: string; // ADD THIS
    }> = {};

    budget.lineItems.forEach(item => {
      const key = item.category?.id || 'uncategorized';
      const categoryName = item.category?.name || 'Uncategorized';
      
      if (!categoryTotals[key]) {
        categoryTotals[key] = {
          category: categoryName,
          budgeted: 0,
          actual: 0,
          color: item.category?.color || '#666',
          icon: item.category?.icon || '📦' // ADD THIS
        };
      }
      
      categoryTotals[key].budgeted += item.budgetAmount;
      categoryTotals[key].actual += item.displayAmount;
    });

    return Object.values(categoryTotals);
  }, [budget.lineItems]);

  const overUnderData = useMemo(() => {
    const categoryTotals: Record<string, {
      category: string;
      balance: number;
      color: string;
      icon: string; // ADD THIS
    }> = {};

    budget.lineItems.forEach(item => {
      const key = item.category?.id || 'uncategorized';
      const categoryName = item.category?.name || 'Uncategorized';
      
      if (!categoryTotals[key]) {
        categoryTotals[key] = {
          category: categoryName,
          balance: 0,
          color: item.category?.color || '#666',
          icon: item.category?.icon || '📦' // ADD THIS
        };
      }
      
      categoryTotals[key].balance += item.balance;
    });

    return Object.values(categoryTotals).sort((a, b) => a.balance - b.balance);
  }, [budget.lineItems]);

  // ========================================
  // PIE CHART - Individual items, grouped by category
  // ========================================
  const spendDistributionData = useMemo(() => {
    // Group by category first
    const grouped: Record<string, BudgetLineItem[]> = {};
    
    budget.lineItems
      .filter(item => item.displayAmount > 0)
      .forEach(item => {
        const key = item.category?.id || 'uncategorized';
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(item);
      });

    // Flatten back out, maintaining category grouping
    const result: any[] = [];
    Object.entries(grouped).forEach(([categoryId, items]) => {
      items
        .sort((a, b) => b.displayAmount - a.displayAmount)
        .forEach(item => {
          result.push({
            name: item.description,
            value: item.displayAmount,
            color: item.category?.color || '#666',
            categoryId: item.category?.id || 'uncategorized'
          });
        });
    });

    return result;
  }, [budget.lineItems]);

  const totalSpent = spendDistributionData.reduce((sum, item) => sum + item.value, 0);

  // ========================================
  // GROUP LINE ITEMS BY CATEGORY FOR TABLES
  // ========================================
  const lineItemsByCategory = useMemo(() => {
    const grouped: Record<string, {
      category: { id: string; name: string; icon: string; color: string } | null;
      items: BudgetLineItem[];
    }> = {};

    budget.lineItems.forEach(item => {
      const key = item.category?.id || 'uncategorized';
      
      if (!grouped[key]) {
        grouped[key] = {
          category: item.category,
          items: []
        };
      }
      
      grouped[key].items.push(item);
    });

    return Object.values(grouped);
  }, [budget.lineItems]);

  // Split into two columns for side-by-side display
  const midpoint = Math.ceil(lineItemsByCategory.length / 2);
  const leftColumnCategories = lineItemsByCategory.slice(0, midpoint);
  const rightColumnCategories = lineItemsByCategory.slice(midpoint);

  // ========================================
  // TOOLTIPS
  // ========================================
  const BudgetVsActualTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;
    const data = payload[0].payload;

    return (
      <div className="bg-[#EEEBD9] px-3 py-2 border border-[#282427] rounded shadow-lg">
        <p className="text-sm font-semibold mb-1">{data.category}</p>

        <div className="text-xs space-y-1">
          <div className="flex justify-between gap-2">
            <span>Budgeted:</span>
            <span className="font-semibold">${data.budgeted.toLocaleString()}</span>
          </div>

          <div className="flex justify-between gap-2">
            <span>Actual:</span>
            <span className="font-semibold">${data.actual.toLocaleString()}</span>
          </div>

          <div
            className={`flex justify-between gap-2 font-bold ${
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

  // ========================================
  // MUTATION HANDLERS
  // ========================================
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

  const handleDeleteLineItem = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteLineItem({ variables: { id: deleteConfirm.id } });
      setDeleteConfirm(null);
      onRefresh();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // ========================================
  // MAIN RENDER
  // ========================================
  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-[#EEEBD9] mb-2">Budget</h1>
        <p className="text-lg text-[#EEEBD9]">{dateRange}</p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="bg-[#EEEBD9] p-3 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Total Budgeted</p>
          <p className="text-2xl font-bold">${budget.totalBudgeted.toLocaleString()}</p>
        </div>

        <div className="bg-[#EEEBD9] p-3 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Total Actual</p>
          <p className="text-2xl font-bold">${budget.totalActual.toLocaleString()}</p>
        </div>

        <div className="bg-[#EEEBD9] p-3 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Balance</p>
          <p className={`text-2xl font-bold ${budget.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {budget.totalBalance >= 0 ? '+' : ''}${budget.totalBalance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* GRAPHS */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        {/* Graph 1 — Budget vs Actual */}
        <div className="bg-[#EEEBD9] rounded-lg p-3">
          <h3 className="text-md font-semibold mb-3">Budget vs Actual</h3>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart 
              data={budgetVsActualData}
              margin={{left: -25, right: 0, top: 0, bottom: 0}}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
              <XAxis
                dataKey="category"
                height={30}
                interval={0}
                tick={({ x, y, index }) => {
                  const categoryData = budgetVsActualData[index];
                  
                  if (!categoryData) return null;

                  return (
                    <text
                      x={x}
                      y={y + 15}
                      textAnchor="middle"
                      fontSize={20}
                    >
                      {categoryData.icon}
                    </text>
                  );
                }}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<BudgetVsActualTooltip />} />
              <Bar dataKey="budgeted" fill="#4ECDC4" className='cursor-pointer' />
              <Bar dataKey="actual" fill="#FF6B6B" className='cursor-pointer' />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Graph 2 — Over/Under */}
        <div className="bg-[#EEEBD9] rounded-lg p-3">
          <h3 className="text-md font-semibold mb-3">Over/Under Budget</h3>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={overUnderData} layout="vertical" margin={{left: -8, right: 0, top: 0, bottom: 0}} >
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="category"
                width={50}
                tick={({ x, y, payload }) => {
                  const categoryData = overUnderData.find(
                    item => item.category === payload.value
                  );
                  
                  if (!categoryData) return null;

                  return (
                    <text
                      x={x - 10}
                      y={y + 5}
                      textAnchor="end"
                      fontSize={20}
                    >
                      {categoryData.icon}
                    </text>
                  );
                }}
              />
              <Tooltip content={<OverUnderTooltip />} />
              <Bar dataKey="balance">
                {overUnderData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.balance >= 0 ? '#10B981' : '#EF4444'}
                    className='cursor-pointer'
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Graph 3 — Spend Distribution */}
        <div className="bg-[#EEEBD9] rounded-lg p-3">
          <h3 className="text-md font-semibold mb-3">Spend Distribution</h3>

          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={spendDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                innerRadius={50}
                outerRadius={80}
                cornerRadius={5}
                fill="#8884d8"
                dataKey="value"
                className='cursor-pointer'
              >
                {spendDistributionData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || COLORS[index % COLORS.length]}
                    stroke='#EEEBD9'
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

      {/* ADD LINE ITEM BUTTON */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setShowAddLineItem(true)}
          className="bg-[#282427] text-[#EEEBD9] px-4 py-2 border-2 border-[#EEEBD9] rounded-lg text-sm font-semibold cursor-pointer hover:bg-[#3a3537]"
        >
          + Add Line Item
        </button>
      </div>

      {/* LINE ITEMS TABLES - TWO COLUMNS */}
      <div className="grid grid-cols-2 gap-2">
        {/* LEFT COLUMN */}
        <div className="space-y-2">
          {leftColumnCategories.map(({ category, items }) => (
            <CategoryTable
              key={category?.id || 'uncategorized'}
              category={category}
              items={items}
              hoveredRow={hoveredRow}
              setHoveredRow={setHoveredRow}
              onUpdate={handleUpdateLineItem}
              onDelete={(item) => setDeleteConfirm(item)}
            />
          ))}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-2">
          {rightColumnCategories.map(({ category, items }) => (
            <CategoryTable
              key={category?.id || 'uncategorized'}
              category={category}
              items={items}
              hoveredRow={hoveredRow}
              setHoveredRow={setHoveredRow}
              onUpdate={handleUpdateLineItem}
              onDelete={(item) => setDeleteConfirm(item)}
            />
          ))}
        </div>
      </div>

      {showAddLineItem && (
        <AddLineItemModal
          categories={categories}
          onAdd={handleAddLineItem}
          onClose={() => setShowAddLineItem(false)}
        />
      )}
      {/* DELETE MODAL */}
      {deleteConfirm && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 min-w-sm max-w-md">
          <h3 className="text-lg font-semibold mb-4 text-center">Confirm Line Item Deletion:</h3>
          <p className="text-gray-600 mb-2 font-bold">
            {deleteConfirm.description}
          </p>
          <p className="text-gray-600 mb-4">
            This action can&apos;t be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDeleteLineItem}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 cursor-pointer"
            >
              Delete
            </button>
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}

// ========================================
// CATEGORY TABLE COMPONENT
// ========================================
interface CategoryTableProps {
  category: { id: string; name: string; icon: string; color: string } | null;
  items: BudgetLineItem[];
  hoveredRow: string | null;
  setHoveredRow: (id: string | null) => void;
  onUpdate: (id: string, field: string, value: any) => void;
  onDelete: (item: { id: string; description: string }) => void;
}

function CategoryTable({
  category,
  items,
  hoveredRow,
  setHoveredRow,
  onUpdate,
  onDelete
}: CategoryTableProps) {
  return (
    <div className="bg-[#EEEBD9] rounded-lg p-4">
      {/* Category Header */}
      <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
        {category?.icon && <span>{category.icon}</span>}
        <span>{category?.name || 'Uncategorized'}</span>
      </h3>

      {/* Table */}
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-[#282427]">
            <th className="w-8"></th>
            <th className="text-left py-2 text-xs font-semibold">Description</th>
            <th className="text-right py-2 text-xs font-semibold w-20">Budget</th>
            <th className="text-right py-2 text-xs font-semibold w-20">Actual</th>
            <th className="text-right py-2 text-xs font-semibold w-20">Balance</th>
          </tr>
        </thead>

        <tbody>
          {items.map(item => (
            <LineItemRow
              key={item.id}
              item={item}
              isHovered={hoveredRow === item.id}
              onMouseEnter={() => setHoveredRow(item.id)}
              onMouseLeave={() => setHoveredRow(null)}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ========================================
// LINE ITEM ROW COMPONENT
// ========================================
interface LineItemRowProps {
  item: BudgetLineItem;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onUpdate: (id: string, field: string, value: any) => void;
  onDelete: (item: { id: string; description: string }) => void;
}

function LineItemRow({
  item,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onUpdate,
  onDelete
}: LineItemRowProps) {
  const [editMode, setEditMode] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<any>(null);

  const handleSave = (field: string) => {
    onUpdate(item.id, field, tempValue);
    setEditMode(null);
    setTempValue(null);
  };

  const handleCancel = () => {
    setEditMode(null);
    setTempValue(null);
  };

  return (
    <tr
      className="border-b border-gray-300 hover:bg-[#d7d5c5]"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* DELETE ICON */}
      <td className="w-8 text-left">
        {isHovered && (
          <button
            onClick={() => onDelete({ id: item.id, description: item.description })}
            className="w-fit h-fit p-1 border-2 border-transparent hover:border-red-600 rounded-md transition cursor-pointer"
            title="Delete line item"
          >
            <Image src="/trash.svg" alt="Delete" width={16} height={16} />
          </button>
        )}
      </td>

      {/* DESCRIPTION */}
      <td className="py-2">
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
            className="w-full p-1 border border-[#282427] rounded text-xs"
            autoFocus
          />
        ) : (
          <span
            onClick={() => {
              setEditMode('description');
              setTempValue(item.description);
            }}
            className="cursor-pointer hover:underline text-xs"
          >
            {item.description}
          </span>
        )}
      </td>

      {/* BUDGET AMOUNT */}
      <td className="py-2 text-right">
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
            className="w-full p-1 border border-[#282427] rounded text-right text-xs"
            autoFocus
          />
        ) : (
          <span
            onClick={() => {
              setEditMode('budgetAmount');
              setTempValue(item.budgetAmount);
            }}
            className="cursor-pointer hover:underline text-xs"
          >
            ${item.budgetAmount.toLocaleString()}
          </span>
        )}
      </td>

      {/* ACTUAL AMOUNT */}
      <td className="py-2 text-right">
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
            className={`w-full p-1 rounded text-right text-xs ${
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
            className={`cursor-pointer hover:underline inline-block px-1 py-0.5 rounded text-xs ${
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
        className={`py-2 text-right font-semibold text-xs ${
          item.balance >= 0 ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {item.balance >= 0 ? '+' : ''}${Math.abs(item.balance).toLocaleString()}
      </td>
    </tr>
  );
}

// ========================================
// ADD LINE ITEM MODAL
// ========================================
function AddLineItemModal({ categories, onAdd, onClose }: any) {
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!description || !budgetAmount) {
      setError('Please fill in all required fields');
      return;
    }

    onAdd(categoryId || null, description, parseFloat(budgetAmount));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#EEEBD9] rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">Add Line Item</h3>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-2">
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
              onChange={e => {
                setDescription(e.target.value);
                setError('');
              }}
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
              onChange={e => {
                setBudgetAmount(e.target.value);
                setError('');
              }}
              className="w-full p-2 border border-[#282427] rounded-lg"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-[#282427] py-2 px-4 rounded-lg font-semibold hover:bg-gray-400 cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={!description || !budgetAmount}
            className="flex-1 bg-[#282427] text-[#EEEBD9] py-2 px-4 rounded-lg font-semibold hover:bg-[#3a3537] disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}