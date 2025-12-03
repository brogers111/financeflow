'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_BUDGET_PERIODS } from '@/lib/graphql/budget-queries';
import BudgetSidebar from '@/components/BudgetSidebar';
import BudgetView from '@/components/BudgetView';
import CreateBudgetModal from '@/components/CreateBudgetModal';

export default function BudgetPage() {
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBudgetSidebar, setShowBudgetSidebar] = useState(false);

  const { data, loading, refetch } = useQuery(GET_BUDGET_PERIODS);

  // Listen for budget modal toggle event from Navigation
  useEffect(() => {
    const handleToggle = () => {
      setShowBudgetSidebar(prev => !prev);
    };

    window.addEventListener('toggleBudgetModal', handleToggle);
    return () => window.removeEventListener('toggleBudgetModal', handleToggle);
  }, []);

  const budgets = data?.budgetPeriods || [];
  const selectedBudget = budgets.find((b: any) => b.id === selectedBudgetId);

  // Auto-select first budget if none selected
  if (!selectedBudgetId && budgets.length > 0) {
    setSelectedBudgetId(budgets[0].id);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#282427]">
        <div className="text-[#EEEBD9]">Loading budgets...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {selectedBudget ? (
            <BudgetView budget={selectedBudget} onRefresh={refetch} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-xl text-[#EEEBD9] mb-4">Create Your First Budget</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-[#EEEBD9] text-[#282427] w-full px-6 py-3 rounded-lg font-semibold cursor-pointer hover:bg-[#d7d5c5]"
                >
                  + New Budget
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <BudgetSidebar
          budgets={budgets}
          selectedBudgetId={selectedBudgetId}
          onSelectBudget={(id) => {
            setSelectedBudgetId(id);
            setShowBudgetSidebar(false); // Close modal after selection
          }}
          onCreateNew={() => setShowCreateModal(true)}
          onRefresh={refetch}
          isOpen={showBudgetSidebar}
          onClose={() => setShowBudgetSidebar(false)}
        />

        {/* Create Modal */}
        {showCreateModal && (
          <CreateBudgetModal
            onClose={() => setShowCreateModal(false)}
            onCreated={(newBudgetId) => {
              setSelectedBudgetId(newBudgetId);
              setShowCreateModal(false);
              refetch();
            }}
          />
        )}
    </div>
  );
}