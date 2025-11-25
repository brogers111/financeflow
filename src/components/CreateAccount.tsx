'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_ACCOUNT } from '@/lib/graphql/queries';

type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD';

export default function CreateAccount() {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('CHECKING');
  const [institution, setInstitution] = useState('');
  const [balance, setBalance] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [createAccount, { loading }] = useMutation(CREATE_ACCOUNT, {
    refetchQueries: ['GetAccounts']
  });

  const resetForm = () => {
    setName('');
    setInstitution('');
    setBalance('');
    setType('CHECKING');
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await createAccount({
        variables: {
          input: {
            name,
            type,
            institution,
            balance: parseFloat(balance) || 0,
          }
        }
      });

      setSuccess(true);
    } catch (err: any) {
      console.error('Error creating account:', err);
      setError(err.message || 'Failed to create account');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-[#EEEBD9] rounded-xl">
      <h2 className="text-2xl font-bold mb-6">Create New Account</h2>

      {/* Success Message */}
      {success && (
        <div className="mt-2 p-4 rounded-md">
          <p className="text-green-800 font-medium text-lg text-center mb-4">
            Account created successfully!
          </p>

          <button
            onClick={resetForm}
            className="w-full mt-3 mx-auto py-2 px-4 rounded-md cursor-pointer border-2 border-green-700 hover:bg-green-100 text-green-700 text-center block"
          >
            Create Another Account
          </button>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Account Name */}
          <div>
            <label className="block text-md font-medium text-[#282427] mb-2">
              Account Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Chase - Checking, Wells Fargo - Credit Card"
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
              placeholder="e.g., Chase, Capital One, American Express"
              className="w-full p-2 border border-[#282427] rounded-lg"
              required
            />
          </div>

          {/* Starting Balance */}
          <div>
            <label className="block text-md font-medium text-[#282427] mb-2">
              Starting Balance ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
              className="w-full p-2 border border-[#282427] rounded-lg"
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
            disabled={loading || !name || !type || !institution}
            className="w-full bg-[#282427] text-white py-2 px-4 rounded-lg cursor-pointer disabled:bg-[#d7d5c5] disabled:text-[#282427] disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      )}
    </div>
  );
}
