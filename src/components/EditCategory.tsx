'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_CATEGORIES, UPDATE_CATEGORY, DELETE_CATEGORY } from '@/lib/graphql/queries';

const PRESET_ICONS = [
  '🍔', '🏠', '🚗', '📱', '✈️', '🏥', '🛒', '🔧', '🎁', '🔑',
  '💳', '🎬', '🏋️', '🎵', '📚', '🎨', '📈', '🚨', '⚖️', '🎯'
];

export default function EditCategory() {
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('#4ECDC4');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: categoriesData, refetch } = useQuery(GET_CATEGORIES);
  const [updateCategory, { loading: updating }] = useMutation(UPDATE_CATEGORY, {
    refetchQueries: ['GetCategories']
  });
  const [deleteCategory, { loading: deleting }] = useMutation(DELETE_CATEGORY, {
    refetchQueries: ['GetCategories', 'GetTransactions']
  });

  const categories = categoriesData?.categories || [];

  const handleCategorySelect = (categoryId: string) => {
    const category = categories.find((c: any) => c.id === categoryId);
    if (category) {
      setSelectedCategoryId(categoryId);
      setName(category.name);
      setIcon(category.icon || '');
      setColor(category.color || '#4ECDC4');
      setError('');
      setSuccess('');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await updateCategory({
        variables: {
          id: selectedCategoryId,
          input: {
            name,
            icon: icon || null,
            color
          }
        }
      });

      setSuccess('Category updated successfully!');
      await refetch();
    } catch (err: any) {
      console.error('Error updating category:', err);
      setError(err.message || 'Failed to update category');
    }
  };

  const handleDelete = async () => {
    setError('');
    setSuccess('');

    try {
      await deleteCategory({
        variables: { id: selectedCategoryId }
      });

      setSuccess('Category deleted successfully!');
      setSelectedCategoryId('');
      setName('');
      setIcon('');
      setColor('#4ECDC4');
      setShowDeleteConfirm(false);
      await refetch();
    } catch (err: any) {
      console.error('Error deleting category:', err);
      setError(err.message || 'Failed to delete category');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-[#EEEBD9] rounded-xl">
      <h2 className="text-2xl font-bold mb-6">Edit Category</h2>

      {/* Category Selection */}
      <div className="mb-4">
        <label className="block text-md font-medium text-[#282427] mb-2">
          Select Category
        </label>
        <select
          value={selectedCategoryId}
          onChange={(e) => handleCategorySelect(e.target.value)}
          className="w-full p-2 border border-[#282427] rounded-lg cursor-pointer"
        >
          <option value="">Choose a category to edit...</option>
          {categories.map((category: any) => (
            <option key={category.id} value={category.id}>
              {category.icon ? `${category.icon} ` : ''}{category.name} ({category.type})
            </option>
          ))}
        </select>
      </div>

      {selectedCategoryId && (
        <form onSubmit={handleUpdate} className="space-y-2">
          {/* Category Name */}
          <div>
            <label className="block text-md font-medium text-[#282427] mb-2">
              Category Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-[#282427] rounded-lg"
              required
            />
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-md font-medium text-[#282427] mb-2">
              Color *
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
              placeholder="Or type your own emoji"
              className="w-full p-2 border border-[#282427] rounded-lg"
              maxLength={2}
            />
          </div>

          {/* Success Message */}
          {success && (
            <div className="text-center mb-2">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="text-center">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={updating || !name}
              className="flex-1 bg-[#282427] text-white py-2 px-4 rounded-lg cursor-pointer disabled:bg-[#d7d5c5] disabled:text-[#282427] disabled:cursor-not-allowed"
            >
              {updating ? 'Updating...' : 'Update'}
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg cursor-pointer hover:bg-red-700 disabled:bg-gray-400"
            >
              Delete
            </button>
          </div>
        </form>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 min-w-sm max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-center">Confirm Category Deletion:</h3>
            <p className="text-gray-600 mb-2 font-bold">
              {icon} {name}
            </p>
            <p className="text-gray-600 mb-4">
              This action can&apos;t be undone. Transactions using this category will become uncategorized.
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
                onClick={() => setShowDeleteConfirm(false)}
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