'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { TOGGLE_PIN_BUDGET, DELETE_BUDGET_PERIOD } from '@/lib/graphql/budget-queries';

interface Budget {
  id: string;
  startDate: string;
  endDate: string;
  isPinned: boolean;
  totalBudgeted: number;
  totalActual: number;
  totalBalance: number;
}

interface Props {
  budgets: Budget[];
  selectedBudgetId: string | null;
  onSelectBudget: (id: string) => void;
  onCreateNew: () => void;
  onRefresh: () => void;
}

export default function BudgetSidebar({
  budgets,
  selectedBudgetId,
  onSelectBudget,
  onCreateNew,
  onRefresh
}: Props) {
  const [togglePin] = useMutation(TOGGLE_PIN_BUDGET);
  const [deleteBudget, { loading: deleting }] = useMutation(DELETE_BUDGET_PERIOD);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; dateRange: string } | null>(null);

  const pinnedBudgets = budgets.filter(b => b.isPinned);
  const unpinnedBudgets = budgets.filter(b => !b.isPinned);

  const handleTogglePin = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await togglePin({ variables: { id } });
    onRefresh();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteBudget({ variables: { id: deleteConfirm.id } });
      setDeleteConfirm(null);
      onRefresh();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const BudgetCard = ({ budget }: { budget: Budget }) => {
    const isSelected = budget.id === selectedBudgetId;
    const isOverBudget = budget.totalBalance < 0;

    return (
      <div
        onClick={() => onSelectBudget(budget.id)}
        className={`
          p-3 mx-2 mb-2 rounded-lg cursor-pointer transition-colors
          ${isSelected ? 'bg-[#282427] text-[#EEEBD9]' : 'bg-transparent text-[#282427] hover:bg-[#d7d5c5]'}
        `}
      >
        <div className="flex items-start justify-between mb-2">
          <p className="text-sm font-semibold">
            {formatDateRange(budget.startDate, budget.endDate)}
          </p>
          <div className="flex gap-1">
            <button
              onClick={(e) => handleTogglePin(budget.id, e)}
              className="text-xs hover:scale-110 transition-transform"
              title={budget.isPinned ? 'Unpin' : 'Pin'}
            >
              {budget.isPinned ? '📌' : '📍'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirm({
                  id: budget.id,
                  dateRange: formatDateRange(budget.startDate, budget.endDate)
                });
              }}
              className="text-xs hover:scale-110 transition-transform"
              title="Delete"
            >
              🗑️
            </button>
          </div>
        </div>

        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span>Budgeted:</span>
            <span className="font-medium">${budget.totalBudgeted.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Actual:</span>
            <span className="font-medium">${budget.totalActual.toLocaleString()}</span>
          </div>
          <div className={`flex justify-between font-semibold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
            <span>Balance:</span>
            <span>{isOverBudget ? '-' : '+'}${Math.abs(budget.totalBalance).toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-80 h-full bg-[#EEEBD9] border-r-2 border-[#282427] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b-2 border-[#282427]">
        <h2 className="text-xl font-bold text-[#282427] mb-3">Budgets</h2>
        <button
          onClick={onCreateNew}
          className="w-full bg-[#282427] text-[#EEEBD9] py-2 rounded-lg font-semibold cursor-pointer hover:bg-[#3a3537] transition-colors"
        >
          + New Budget
        </button>
      </div>

      {/* Scrollable Budget List */}
      <div className="flex-1 overflow-y-auto">
        {/* Pinned Section */}
        {pinnedBudgets.length > 0 && (
          <div className="py-3 border-b-2 border-[#282427]">
            <p className="px-4 text-xs font-semibold text-gray-600 mb-2">PINNED</p>
            {pinnedBudgets.map(budget => (
              <BudgetCard key={budget.id} budget={budget} />
            ))}
          </div>
        )}

        {/* All Budgets Section */}
        <div className="py-3">
          <p className="px-4 text-xs font-semibold text-gray-600 mb-2">ALL BUDGETS</p>
          {unpinnedBudgets.map(budget => (
            <BudgetCard key={budget.id} budget={budget} />
          ))}
        </div>

        {budgets.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No budgets yet</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 min-w-sm max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-center">Confirm Budget Deletion:</h3>
            <p className="text-gray-600 mb-2 font-bold">
              {deleteConfirm.dateRange}
            </p>
            <p className="text-gray-600 mb-4">
              This action can&apos;t be undone and will delete all line items in this budget.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:bg-gray-400 cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete'}
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