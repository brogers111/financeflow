'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { UPLOAD_STATEMENT, CATEGORIZE_WITH_AI } from '@/lib/graphql/queries';
import { GET_ACCOUNTS } from '@/lib/graphql/queries';

type StatementType = 
  | 'CHASE_CHECKING'
  | 'CHASE_PERSONAL_SAVINGS'
  | 'CHASE_CREDIT'
  | 'CHASE_BUSINESS_SAVINGS'
  | 'CAPITAL_ONE_SAVINGS';

export default function UploadStatement() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState('');
  const [statementType, setStatementType] = useState<StatementType>('CHASE_CHECKING');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { data: accountsData } = useQuery(GET_ACCOUNTS);
  const [uploadStatement] = useMutation(UPLOAD_STATEMENT);
  const [categorizeWithAI] = useMutation(CATEGORIZE_WITH_AI);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !accountId) {
        alert('Please select a file and account');
        return;
    }

    setUploading(true);
    setResult(null);

    try {
        // Convert file to base64
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        
        reader.onload = async () => {
        const base64 = reader.result?.toString().split(',')[1];
        
        if (!base64) {
            alert('Failed to read file');
            setUploading(false);
            return;
        }

        try {
            // Upload statement
            const { data, errors } = await uploadStatement({
            variables: {
                fileContent: base64,
                accountId,
                statementType
            }
            });

            console.log('📤 Upload response:', { data, errors });

            if (errors) {
            console.error('GraphQL errors:', errors);
            alert(`Upload failed: ${errors[0]?.message || 'Unknown error'}`);
            setUploading(false);
            return;
            }

            if (!data?.uploadStatement) {
            console.error('No data returned');
            alert('Upload failed: No data returned');
            setUploading(false);
            return;
            }

            setResult(data.uploadStatement);
            setUploading(false);
        } catch (uploadError) {
            console.error('Upload mutation error:', uploadError);
            alert(`Upload failed: ${uploadError}`);
            setUploading(false);
        }
        };

        reader.onerror = () => {
        alert('Failed to read file');
        setUploading(false);
        };
    } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload statement');
        setUploading(false);
      }
    };

  const handleAICategorization = async () => {
    if (!result?.needsCategorization?.length) return;

    try {
      const transactionIds = result.needsCategorization.map((t: any) => t.id);
      
      const { data } = await categorizeWithAI({
        variables: { transactionIds }
      });

      alert(`AI Categorized ${data.categorizeTransactionsWithAI.categorized} of ${data.categorizeTransactionsWithAI.total} transactions`);
      setResult(null); // Clear results after categorization
    } catch (error) {
      console.error('AI categorization error:', error);
      alert('Failed to categorize with AI');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Upload Bank Statement</h2>

      {/* Account Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Account</label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full p-2 border rounded-md"
        >
          <option value="">Select an account</option>
          {accountsData?.accounts?.map((account: any) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.institution})
            </option>
          ))}
        </select>
      </div>

      {/* Statement Type Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Statement Type</label>
        <select
          value={statementType}
          onChange={(e) => setStatementType(e.target.value as StatementType)}
          className="w-full p-2 border rounded-md"
        >
          <option value="CHASE_CHECKING">Chase Checking</option>
          <option value="CHASE_PERSONAL_SAVINGS">Chase Personal Savings</option>
          <option value="CHASE_CREDIT">Chase Credit Card</option>
          <option value="CHASE_BUSINESS_SAVINGS">Chase Business Savings</option>
          <option value="CAPITAL_ONE_SAVINGS">Capital One Savings</option>
        </select>
      </div>

      {/* File Upload */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">PDF Statement</label>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="w-full p-2 border rounded-md"
        />
        {selectedFile && (
          <p className="text-sm text-gray-600 mt-1">
            Selected: {selectedFile.name}
          </p>
        )}
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={uploading || !selectedFile || !accountId}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {uploading ? 'Uploading...' : 'Upload Statement'}
      </button>

      {/* Results */}
      {result && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <h3 className="font-semibold text-green-800 mb-2">Upload Successful!</h3>
          <p className="text-sm text-green-700">
            ✅ Created {result.transactionsCreated} transactions
          </p>
          
          {result.needsCategorization?.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-orange-700 mb-2">
                ⚠️ {result.needsCategorization.length} transactions need categorization
              </p>
              <button
                onClick={handleAICategorization}
                className="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 text-sm"
              >
                🤖 Categorize with AI
              </button>
              
              <div className="mt-3 max-h-40 overflow-y-auto">
                {result.needsCategorization.map((t: any) => (
                  <div key={t.id} className="text-xs text-gray-600 py-1 border-b">
                    {t.description} - ${Math.abs(t.amount).toFixed(2)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}