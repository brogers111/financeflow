'use client';

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
  const [deleteBudget] = useMutation(DELETE_BUDGET_PERIOD);

  const pinnedBudgets = budgets.filter(b => b.isPinned);
  const unpinnedBudgets = budgets.filter(b => !b.isPinned);

  const handleTogglePin = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await togglePin({ variables: { id } });
    onRefresh();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this budget? This cannot be undone.')) {
      await deleteBudget({ variables: { id } });
      onRefresh();
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
              onClick={(e) => handleDelete(budget.id, e)}
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
    </div>
  );
}