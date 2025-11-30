'use client';

import { useState } from 'react';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client';
import { 
  CHECK_BUDGET_OVERLAP, 
  CREATE_BUDGET_PERIOD, 
  CREATE_BUDGET_LINE_ITEM,
  SUGGEST_BUDGET_AMOUNTS,
} from '@/lib/graphql/budget-queries';
import { GET_CATEGORIES } from '@/lib/graphql/queries';

interface Props {
  onClose: () => void;
  onCreated: (budgetId: string) => void;
}

export default function CreateBudgetModal({ onClose, onCreated }: Props) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [showOverlapWarning, setShowOverlapWarning] = useState(false);
  const [overlappingPeriods, setOverlappingPeriods] = useState<any[]>([]);
  const [step, setStep] = useState<'dates' | 'suggestions'>('dates');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());

  const [checkOverlap] = useLazyQuery(CHECK_BUDGET_OVERLAP);
  const [getSuggestions] = useLazyQuery(SUGGEST_BUDGET_AMOUNTS);
  const { data: categoriesData } = useQuery(GET_CATEGORIES);
  
  const [createBudget, { loading }] = useMutation(CREATE_BUDGET_PERIOD);
  const [createLineItem] = useMutation(CREATE_BUDGET_LINE_ITEM);

  const categories = categoriesData?.categories || [];

  const handleCheckDates = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      setError('End date must be after start date.');
      return;
    }

    setError('');

    // Check for overlaps
    const { data } = await checkOverlap({
      variables: { startDate, endDate }
    });

    if (data?.checkBudgetOverlap?.hasOverlap) {
      setOverlappingPeriods(data.checkBudgetOverlap.overlappingPeriods);
      setShowOverlapWarning(true);
    } else {
      // No overlap, proceed to suggestions
      await loadSuggestions();
    }
  };

  const handleContinueWithOverlap = async () => {
    setShowOverlapWarning(false);
    await loadSuggestions();
  };

  const loadSuggestions = async () => {
    // Get suggestions
    const { data } = await getSuggestions({
      variables: { startDate, endDate }
    });

    const suggestedAmounts = data?.suggestBudgetAmounts || [];

    // If we have suggestions, show them
    if (suggestedAmounts.length > 0) {
      setSuggestions(suggestedAmounts);
      // Auto-select all suggestions
      setSelectedSuggestions(new Set(suggestedAmounts.map((s: any) => s.categoryId || 'uncategorized')));
      setStep('suggestions');
    } else {
      // No suggestions, create empty budget
      await createEmptyBudget();
    }
  };

  const createEmptyBudget = async () => {
    try {
      const { data } = await createBudget({
        variables: {
          input: {
            startDate,
            endDate
          }
        }
      });

      onCreated(data.createBudgetPeriod.id);
    } catch (error) {
      console.error('Error creating budget:', error);
      setError('Failed to create budget. Please try again.');
    }
  };

    const handleCreateWithSuggestions = async () => {
    try {
        // Create the budget period first
        const { data } = await createBudget({
        variables: {
            input: {
            startDate,
            endDate
            }
        }
        });

        const budgetId = data.createBudgetPeriod.id;

        // Get selected suggestions
        const selectedSuggestionsList = suggestions.filter(s => 
        selectedSuggestions.has(s.categoryId || 'uncategorized')
        );
        
        for (const suggestion of selectedSuggestionsList) {
        await createLineItem({
            variables: {
            budgetPeriodId: budgetId,
            input: {
                categoryId: suggestion.categoryId || null,
                description: suggestion.categoryName,
                budgetAmount: suggestion.suggestedAmount
            }
            }
        });
        }

        onCreated(budgetId);
    } catch (error) {
        console.error('Error creating budget:', error);
        setError('Failed to create budget with suggestions. Please try again.');
    }
    };

  const toggleSuggestion = (categoryId: string | null) => {
    const key = categoryId || 'uncategorized';
    const newSet = new Set(selectedSuggestions);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedSuggestions(newSet);
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#EEEBD9] rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Step 1: Date Selection */}
        {step === 'dates' && !showOverlapWarning && (
          <>
            <h2 className="text-2xl font-bold mb-4 text-[#282427]">Create New Budget</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[#282427] mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 border border-[#282427] rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#282427] mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 border border-[#282427] rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {error && (
              <div className="mb-3 text-red-600 text-center">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-300 text-[#282427] py-2 px-4 rounded-lg font-semibold cursor-pointer hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckDates}
                disabled={!startDate || !endDate}
                className="flex-1 bg-[#282427] text-[#EEEBD9] py-2 px-4 rounded-lg font-semibold cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-[#3a3537]"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {/* Overlap Warning */}
        {showOverlapWarning && (
          <>
            <h2 className="text-2xl font-bold mb-4">Overlapping Budgets Detected</h2>

            <p className="text-[#282427] mb-4">
              The following budgets overlap with your selected dates:
            </p>

            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 mb-6 space-y-2">
              {overlappingPeriods.map((period) => (
                <div key={period.id} className="flex justify-between items-center">
                  <span className="font-medium">
                    {formatDateRange(period.startDate, period.endDate)}
                  </span>
                  <span className="text-sm text-gray-600">
                    ${period.totalBudgeted.toLocaleString()} budgeted
                  </span>
                </div>
              ))}
            </div>

            <p className="text-sm text-gray-600 mb-6">
              You can continue creating this budget, but be aware that overlapping budgets may 
              make it harder to track your spending accurately.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowOverlapWarning(false);
                  setOverlappingPeriods([]);
                }}
                className="flex-1 bg-gray-300 text-[#282427] py-2 px-4 rounded-lg font-semibold cursor-pointer hover:bg-gray-400"
              >
                Change Dates
              </button>
              <button
                onClick={handleContinueWithOverlap}
                className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg font-semibold cursor-pointer hover:bg-orange-600"
              >
                Continue Anyway
              </button>
            </div>
          </>
        )}

        {/* Step 2: Suggestions */}
        {step === 'suggestions' && (
          <>
            <h2 className="text-2xl font-bold mb-4 text-[#282427]">Budget Suggestions</h2>

            <p className="text-sm text-gray-600 mb-4">
              Based on your previous budgets, here are some suggested amounts. 
              Select which categories to include:
            </p>

            <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
              {suggestions.map((suggestion) => {
                const key = suggestion.categoryId || 'uncategorized';
                const isSelected = selectedSuggestions.has(key);
                const category = categories.find((c: any) => c.id === suggestion.categoryId);

                return (
                  <div
                    key={key}
                    onClick={() => toggleSuggestion(suggestion.categoryId)}
                    className={`
                      p-2 rounded-lg cursor-pointer border-2 hover:bg-[#d7d5c5] transition-colors
                      ${isSelected 
                        ? 'border-black' 
                        : 'border-transparent'
                      }
                    `}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold flex items-center gap-2">
                        {category?.icon && <span>{category.icon}</span>}
                        {suggestion.categoryName}
                      </span>
                      <span className="text-lg font-bold">
                        ${suggestion.suggestedAmount.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Based on: {suggestion.basedOnPeriods.join(', ')}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('dates')}
                className="flex-1 bg-gray-300 text-[#282427] py-2 px-4 rounded-lg font-semibold cursor-pointer hover:bg-gray-400"
              >
                Back
              </button>
              <button
                onClick={createEmptyBudget}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg font-semibold cursor-pointer hover:bg-gray-600"
              >
                Skip Suggestions
              </button>
              <button
                onClick={handleCreateWithSuggestions}
                disabled={loading || selectedSuggestions.size === 0}
                className="flex-1 bg-[#282427] text-[#EEEBD9] py-2 px-4 rounded-lg font-semibold cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-[#3a3537]"
              >
                {loading ? 'Creating...' : `Create`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}