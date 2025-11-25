'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_ACCOUNTS, UPDATE_ACCOUNT, DELETE_ACCOUNT } from '@/lib/graphql/queries';

type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD';

export default function EditAccount() {
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('CHECKING');
  const [institution, setInstitution] = useState('');
  const [balance, setBalance] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: accountsData, refetch } = useQuery(GET_ACCOUNTS);
  const [updateAccount, { loading: updating }] = useMutation(UPDATE_ACCOUNT, {
    refetchQueries: ['GetAccounts', 'GetDashboardStats']
  });
  const [deleteAccount, { loading: deleting }] = useMutation(DELETE_ACCOUNT, {
    refetchQueries: ['GetAccounts', 'GetDashboardStats']
  });

  const accounts = accountsData?.accounts || [];

  const handleAccountSelect = (accountId: string) => {
    const account = accounts.find((a: any) => a.id === accountId);
    if (account) {
      setSelectedAccountId(accountId);
      setName(account.name);
      setType(account.type);
      setInstitution(account.institution);
      setBalance(account.balance.toFixed(2));
      setError('');
      setSuccess('');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await updateAccount({
        variables: {
          id: selectedAccountId,
          input: {
            name,
            type,
            institution,
            balance: parseFloat(balance)
          }
        }
      });

      setSuccess('Account updated successfully!');
      await refetch();
    } catch (err: any) {
      console.error('Error updating account:', err);
      setError(err.message || 'Failed to update account');
    }
  };

  const handleDelete = async () => {
    setError('');
    setSuccess('');

    try {
      await deleteAccount({
        variables: { id: selectedAccountId }
      });

      setSuccess('Account deleted successfully!');
      setSelectedAccountId('');
      setName('');
      setInstitution('');
      setBalance('');
      setShowDeleteConfirm(false);
      await refetch();
    } catch (err: any) {
      console.error('Error deleting account:', err);
      setError(err.message || 'Failed to delete account');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-[#EEEBD9] rounded-xl">
      <h2 className="text-2xl font-bold mb-6">Edit Bank Account</h2>

      {/* Account Selection */}
      <div className="mb-4">
        <label className="block text-md font-medium text-[#282427] mb-2">
          Select Account
        </label>
        <select
          value={selectedAccountId}
          onChange={(e) => handleAccountSelect(e.target.value)}
          className="w-full p-2 border border-[#282427] rounded-lg cursor-pointer"
        >
          <option value="">Choose an account to edit...</option>
          {accounts.map((account: any) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>

      {selectedAccountId && (
        <form onSubmit={handleUpdate} className="space-y-4">
          {/* Account Name */}
          <div>
            <label className="block text-md font-medium text-[#282427] mb-2">
              Account Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-[#282427] rounded-lg"
              required
            />
          </div>

          {/* Account Type */}
          <div>
            <label className="block text-md font-medium text-[#282427] mb-2">
              Account Type *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
              className="w-full p-2 border border-[#282427] rounded-lg cursor-pointer"
              required
            >
              <option value="CHECKING">Checking</option>
              <option value="SAVINGS">Savings</option>
              <option value="CREDIT_CARD">Credit Card</option>
            </select>
          </div>

          {/* Institution */}
          <div>
            <label className="block text-md font-medium text-[#282427] mb-2">
              Institution *
            </label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full p-2 border border-[#282427] rounded-lg"
              required
            />
          </div>

          {/* Balance */}
          <div>
            <label className="block text-md font-medium text-[#282427] mb-2">
              Current Balance ($) *
            </label>
            <input
              type="number"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="w-full p-2 border border-[#282427] rounded-lg"
              required
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
              disabled={updating || !name || !type || !institution || !balance }
              className="flex-1 bg-[#282427] text-white py-2 px-4 rounded-lg cursor-pointer disabled:bg-[#d7d5c5] disabled:text-[#282427] disabled:cursor-not-allowed"
            >
              {updating ? 'Updating...' : 'Update Account'}
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg cursor-pointer hover:bg-red-700 disabled:bg-gray-400"
            >
              Delete Account
            </button>
          </div>
        </form>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 min-w-sm max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-center">Confirm Account Deletion:</h3>
            <p className="text-gray-600 mb-2 font-bold">
              {name}
            </p>
            <p className="text-gray-600 mb-4">
              This action cannot be undone and will delete all associated transactions.
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