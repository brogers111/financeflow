'use client';

import { useState } from 'react';
import CreateAccount from '@/components/CreateAccount';
import CreateInvestmentPortfolio from '@/components/CreateInvestmentPortfolio';
import EditAccount from '@/components/EditAccount';
import EditInvestmentPortfolio from '@/components/EditInvestmentPortfolio';
import AddCategory from '@/components/CreateCategory';
import EditCategory from '@/components/EditCategory';

type CreateMode = 'create-account' | 'create-investment' | 'edit-account' | 'edit-investment' | 'add-category' | 'edit-category';

export default function CreatePage() {
  const [mode, setMode] = useState<CreateMode | null>(null);

  const getModeTitle = (currentMode: CreateMode) => {
    switch(currentMode) {
      case 'create-account': return 'Create';
      case 'edit-account': return 'Edit';
      case 'create-investment': return 'Create';
      case 'edit-investment': return 'Edit';
      case 'add-category': return 'Create';
      case 'edit-category': return 'Edit';
      default: return '';
    }
  };

  return (
    <div className="mx-auto p-4 md:p-6 pb-24 md:pb-6">
      {/* Desktop: Header with buttons on the side */}
      <div className="hidden md:flex justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#EEEBD9]">Create & Edit</h1>

        {/* Mode Selection Buttons - Desktop */}
        <div className="flex gap-4">
          <button
            onClick={() => setMode('create-account')}
            className={`py-2 px-3 cursor-pointer transition rounded-lg border-2 ${
              mode === 'create-account'
                ? 'border-[#EEEBD9]'
                : 'border-transparent hover:border-gray-700'
            }`}
          >
            <div className="font-semibold text-[#EEEBD9]">Create Account</div>
          </button>

          <button
            onClick={() => setMode('edit-account')}
            className={`py-2 px-3 cursor-pointer transition rounded-lg border-2 ${
              mode === 'edit-account'
                ? 'border-[#EEEBD9]'
                : 'border-transparent hover:border-gray-700'
            }`}
          >
            <div className="font-semibold text-[#EEEBD9]">Edit Account</div>
          </button>

          <button
            onClick={() => setMode('create-investment')}
            className={`py-2 px-3 cursor-pointer transition rounded-lg border-2 ${
              mode === 'create-investment'
                ? 'border-[#EEEBD9]'
                : 'border-transparent hover:border-gray-700'
            }`}
          >
            <div className="font-semibold text-[#EEEBD9]">Create Investment</div>
          </button>

          <button
            onClick={() => setMode('edit-investment')}
            className={`py-2 px-3 cursor-pointer transition rounded-lg border-2 ${
              mode === 'edit-investment'
                ? 'border-[#EEEBD9]'
                : 'border-transparent hover:border-gray-700'
            }`}
          >
            <div className="font-semibold text-[#EEEBD9]">Edit Investment</div>
          </button>

          <button
            onClick={() => setMode('add-category')}
            className={`py-2 px-3 cursor-pointer transition rounded-lg border-2 ${
              mode === 'add-category'
                ? 'border-[#EEEBD9]'
                : 'border-transparent hover:border-gray-700'
            }`}
          >
            <div className="font-semibold text-[#EEEBD9]">Create Category</div>
          </button>

          <button
            onClick={() => setMode('edit-category')}
            className={`py-2 px-3 cursor-pointer transition rounded-lg border-2 ${
              mode === 'edit-category'
                ? 'border-[#EEEBD9]'
                : 'border-transparent hover:border-gray-700'
            }`}
          >
            <div className="font-semibold text-[#EEEBD9]">Edit Category</div>
          </button>
        </div>
      </div>

      {/* Mobile: Selection screen or form with back button */}
      {!mode ? (
        <div className="md:hidden">
          <h1 className="text-2xl font-bold text-[#EEEBD9] mb-10 text-start">Create & Edit</h1>

          <div className="flex flex-col gap-3 max-w-sm mx-auto">
            <button
              onClick={() => setMode('create-account')}
              className="py-3 px-4 cursor-pointer transition rounded-lg border-2 border-[#EEEBD9] hover:bg-[#EEEBD9] hover:text-[#282427]"
            >
              <div className="font-semibold text-[#EEEBD9] hover:text-[#282427]">Create Account</div>
            </button>

            <button
              onClick={() => setMode('edit-account')}
              className="py-3 px-4 cursor-pointer transition rounded-lg border-2 border-[#EEEBD9] hover:bg-[#EEEBD9] hover:text-[#282427]"
            >
              <div className="font-semibold text-[#EEEBD9]">Edit Account</div>
            </button>

            <button
              onClick={() => setMode('create-investment')}
              className="py-3 px-4 cursor-pointer transition rounded-lg border-2 border-[#EEEBD9] hover:bg-[#EEEBD9] hover:text-[#282427]"
            >
              <div className="font-semibold text-[#EEEBD9]">Create Investment</div>
            </button>

            <button
              onClick={() => setMode('edit-investment')}
              className="py-3 px-4 cursor-pointer transition rounded-lg border-2 border-[#EEEBD9] hover:bg-[#EEEBD9] hover:text-[#282427]"
            >
              <div className="font-semibold text-[#EEEBD9]">Edit Investment</div>
            </button>

            <button
              onClick={() => setMode('add-category')}
              className="py-3 px-4 cursor-pointer transition rounded-lg border-2 border-[#EEEBD9] hover:bg-[#EEEBD9] hover:text-[#282427]"
            >
              <div className="font-semibold text-[#EEEBD9]">Create Category</div>
            </button>

            <button
              onClick={() => setMode('edit-category')}
              className="py-3 px-4 cursor-pointer transition rounded-lg border-2 border-[#EEEBD9] hover:bg-[#EEEBD9] hover:text-[#282427]"
            >
              <div className="font-semibold text-[#EEEBD9]">Edit Category</div>
            </button>
          </div>
        </div>
      ) : (
        <div className="md:hidden">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setMode(null)}
              className="text-[#EEEBD9] hover:text-white transition cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-[#EEEBD9]">{getModeTitle(mode)}</h2>
          </div>
        </div>
      )}

      {/* Render Selected Component */}
      <div className="rounded-lg p-0 md:p-6">
        <div className="mx-4 mt-10 md:mx-0">
          {mode === 'create-account' && <CreateAccount />}
          {mode === 'create-investment' && <CreateInvestmentPortfolio />}
          {mode === 'edit-account' && <EditAccount />}
          {mode === 'edit-investment' && <EditInvestmentPortfolio />}
          {mode === 'add-category' && <AddCategory />}
          {mode === 'edit-category' && <EditCategory />}
        </div>
      </div>
    </div>
  );
}