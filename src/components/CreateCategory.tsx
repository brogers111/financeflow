'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_CATEGORY, GET_CATEGORIES } from '@/lib/graphql/queries';

type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

const PRESET_ICONS = [
  '🍔', '🏠', '🚗', '📱', '✈️', '🏥', '🛒', '🔧', '🎁', '🔑',
  '💳', '🎬', '🏋️', '🎵', '📚', '🎨', '📈', '🚨', '⚖️', '🎯'
];

export default function AddCategory() {
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('#4ECDC4');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [createCategory, { loading }] = useMutation(CREATE_CATEGORY, {
    refetchQueries: ['GetCategories']
  });

  const resetForm = () => {
    setName('');
    setType('EXPENSE');
    setIcon('');
    setColor('#4ECDC4');
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await createCategory({
        variables: {
          input: {
            name,
            type,
            icon: icon || null,
            color
          }
        }
      });

      setSuccess(true);
    } catch (err: any) {
      console.error('Error creating category:', err);
      setError(err.message || 'Failed to create category');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-[#EEEBD9] rounded-xl">
      <h2 className="text-2xl font-bold mb-6">Create New Category</h2>

      {/* Success Message */}
      {success && (
        <div className="mt-2 p-4 rounded-md">
          <p className="text-green-800 font-medium text-lg text-center mb-4">
            Category created successfully!
          </p>

          <button
            onClick={resetForm}
            className="w-full mt-3 mx-auto py-2 px-4 rounded-md cursor-pointer border-2 border-green-700 hover:bg-green-100 text-green-700 text-center block"
          >
            Create Another Category
          </button>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Category Name */}
          <div>
            <label className="block text-md font-medium text-[#282427] mb-2">
              Category Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Groceries, Salary, Savings Contribution"
              className="w-full p-2 border border-[#282427] rounded-lg"
              required
            />
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-md font-medium text-[#282427] mb-2">
              Transaction Type *
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setType('EXPENSE')}
                className={`flex-1 py-2 rounded-lg border border-[#282427] cursor-pointer
                  ${type === 'EXPENSE' ? 'bg-[#282427] text-white' : 'bg-transparent text-black'}`}
              >
                Expense
              </button>

              <button
                type="button"
                onClick={() => setType('INCOME')}
                className={`flex-1 py-2 rounded-lg border border-[#282427] cursor-pointer
                  ${type === 'INCOME' ? 'bg-[#282427] text-white' : 'bg-transparent text-black'}`}
              >
                Income
              </button>

              <button
                type="button"
                onClick={() => setType('TRANSFER')}
                className={`flex-1 py-2 rounded-lg border border-[#282427] cursor-pointer
                  ${type === 'TRANSFER' ? 'bg-[#282427] text-white' : 'bg-transparent text-black'}`}
              >
                Transfer
              </button>
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-md font-medium text-[#282427] mb-2">
              Select Color *
            </label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-20 p-1 border border-[#282427] rounded-lg cursor-pointer"
            />
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-md font-medium text-[#282427] mb-2">
              Icon (optional)
            </label>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-2">
              {PRESET_ICONS.map((presetIcon) => (
                <button
                  key={presetIcon}
                  type="button"
                  onClick={() => setIcon(presetIcon)}
                  className={`p-2 text-2xl rounded-lg border-2 cursor-pointer hover:bg-gray-100
                    ${icon === presetIcon ? 'border-[#282427] bg-gray-100' : 'border-gray-300'}`}
                >
                  {presetIcon}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Or paste in your own emoji"
              className="w-full p-2 border border-[#282427] rounded-lg"
              maxLength={2}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-center mb-2">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !name || !type}
            className="w-full bg-[#282427] text-white py-2 px-4 rounded-lg cursor-pointer disabled:bg-[#d7d5c5] disabled:text-[#282427] disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Category...' : 'Create Category'}
          </button>
        </form>
      )}
    </div>
  );
}