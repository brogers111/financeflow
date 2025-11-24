'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_ACCOUNT } from '@/lib/graphql/queries';

type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH';

export default function CreateAccount() {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('CHECKING');
  const [institution, setInstitution] = useState('');
  const [balance, setBalance] = useState('');

  const [createAccount, { loading }] = useMutation(CREATE_ACCOUNT, {
    refetchQueries: ['GetAccounts']
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createAccount({
        variables: {
          input: {
            name,
            type,
            institution,
            balance: parseFloat(balance) || 0,
            isActive: true
          }
        }
      });

      // Reset form
      setName('');
      setInstitution('');
      setBalance('');
      alert('Account created successfully!');
    } catch (error) {
      console.error('Error creating account:', error);
      alert('Failed to create account');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Account Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Chase Checking, Amex Gold Card"
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Account Type *
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as AccountType)}
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        >
          <option value="CHECKING">Checking</option>
          <option value="SAVINGS">Savings</option>
          <option value="CREDIT_CARD">Credit Card</option>
          <option value="CASH">Cash</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Institution *
        </label>
        <input
          type="text"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          placeholder="e.g., Chase, Capital One, American Express"
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Starting Balance ($)
        </label>
        <input
          type="number"
          step="0.01"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="0.00"
          className="w-full p-2 border border-gray-300 rounded-md"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>
  );
}