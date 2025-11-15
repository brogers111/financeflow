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
  const [categorizing, setCategorizing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const { data: accountsData } = useQuery(GET_ACCOUNTS);
  const [uploadStatement] = useMutation(UPLOAD_STATEMENT);
  const [categorizeWithAI] = useMutation(CATEGORIZE_WITH_AI);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setSuccessMessage('');
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setAccountId('');
    setStatementType('CHASE_CHECKING');
    setResult(null);
    setSuccessMessage('');
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile || !accountId) {
      alert('Please select a file and account');
      return;
    }

    setUploading(true);
    setResult(null);
    setSuccessMessage('');

    try {
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
          const { data, errors } = await uploadStatement({
            variables: {
              fileContent: base64,
              accountId,
              statementType
            }
          });

          if (errors) {
            console.error('GraphQL errors:', errors);
            alert(`Upload failed: ${errors[0]?.message || 'Unknown error'}`);
            setUploading(false);
            return;
          }

          if (!data?.uploadStatement) {
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

    setCategorizing(true);
    try {
      const transactionIds = result.needsCategorization.map((t: any) => t.id);
      
      const { data } = await categorizeWithAI({
        variables: { transactionIds }
      });

      setCategorizing(false);
      setSuccessMessage(
        `✅ Successfully uploaded ${result.transactionsCreated} transactions and AI categorized ${data.categorizeTransactionsWithAI.categorized} of ${data.categorizeTransactionsWithAI.total} uncategorized transactions!`
      );
      setResult(null);
    } catch (error) {
      console.error('AI categorization error:', error);
      alert('Failed to categorize with AI');
      setCategorizing(false);
    }
  };

  const handleSkipCategorization = () => {
    setSuccessMessage(
      `✅ Successfully added ${result.transactionsCreated} transactions! ${result.needsCategorization?.length || 0} transactions need manual categorization.`
    );
    setResult(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Upload Bank Statement</h2>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800 font-medium">{successMessage}</p>
          <button
            onClick={resetForm}
            className="mt-3 text-green-700 underline hover:text-green-900"
          >
            Upload another statement
          </button>
        </div>
      )}

      {!successMessage && (
        <>
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
            {uploading ? 'Processing PDF...' : 'Upload Statement'}
          </button>

          {/* Results */}
          {result && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="font-semibold text-green-800 mb-2">Upload Successful!</h3>
              <p className="text-sm text-green-700 mb-4">
                ✅ Created {result.transactionsCreated} transactions
              </p>
              
              {result.needsCategorization?.length > 0 ? (
                <div>
                  <p className="text-sm text-orange-700 mb-3">
                    ⚠️ {result.needsCategorization.length} transactions need categorization
                  </p>
                  
                  <div className="flex gap-3 mb-4">
                    <button
                      onClick={handleAICategorization}
                      disabled={categorizing}
                      className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:bg-purple-400 text-sm"
                    >
                      {categorizing ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Categorizing with AI...
                        </span>
                      ) : (
                        '🤖 Categorize with AI'
                      )}
                    </button>
                    <button
                      onClick={handleSkipCategorization}
                      disabled={categorizing}
                      className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 disabled:bg-gray-400 text-sm"
                    >
                      Skip (Categorize Manually)
                    </button>
                  </div>
                  
                  <div className="max-h-40 overflow-y-auto bg-white rounded border">
                    {result.needsCategorization.map((t: any) => (
                      <div key={t.id} className="text-xs text-gray-600 py-2 px-3 border-b last:border-0">
                        {t.description} - ${Math.abs(t.amount).toFixed(2)}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-green-700 mb-3">
                    🎉 All transactions were automatically categorized!
                  </p>
                  <button
                    onClick={handleSkipCategorization}
                    className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 text-sm"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}