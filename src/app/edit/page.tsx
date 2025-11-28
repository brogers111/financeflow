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
  const [mode, setMode] = useState<CreateMode>('create-account');

  return (
    <div className="mx-auto p-6">
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold text-[#EEEBD9]">Edit</h1>

        {/* Mode Selection Buttons */}
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

      {/* Render Selected Component */}
      <div className="rounded-lg p-6">
        {mode === 'create-account' && <CreateAccount />}
        {mode === 'create-investment' && <CreateInvestmentPortfolio />}
        {mode === 'edit-account' && <EditAccount />}
        {mode === 'edit-investment' && <EditInvestmentPortfolio />}
        {mode === 'add-category' && <AddCategory />}
        {mode === 'edit-category' && <EditCategory />}
      </div>
    </div>
  );
}