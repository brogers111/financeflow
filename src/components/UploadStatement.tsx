'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import Link from 'next/link';
import { UPLOAD_STATEMENT } from '@/lib/graphql/queries';
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
  const [successMessage, setSuccessMessage] = useState('');

  const { data: accountsData } = useQuery(GET_ACCOUNTS);
  const [uploadStatement] = useMutation(UPLOAD_STATEMENT);

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
          
          // Show success message
          const uncategorizedCount = data.uploadStatement.needsCategorization?.length || 0;
          setSuccessMessage(
            `Successfully uploaded ${data.uploadStatement.transactionsCreated} transactions!\n\n${
              uncategorizedCount > 0 
                ? `${uncategorizedCount} transactions need manual categorization.` 
                : 'All transactions were automatically categorized!'
            }`
          );
          setResult(null);
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

  return (
    <div className="max-w-2xl mx-auto p-6 bg-[#EEEBD9] rounded-xl">
      <h2 className="text-2xl font-bold mb-6">Upload Bank Statement</h2>
      {/* Success Message */}
      {successMessage && (
        <div className="mt-2 p-4 rounded-md">
          <p
            className="text-green-800 font-medium text-lg text-center mb-4"
            style={{ whiteSpace: 'pre-line' }}
          >
            {successMessage}
          </p>
          <div className='flex gap-4'>
            <button
              onClick={resetForm}
              className="w-1/2 mt-3 mx-auto py-2 px-4 rounded-md cursor-pointer border-2 border-green-700 hover:bg-green-100 text-green-700 text-center block"
            >
              Upload Another Statement
            </button>
            <Link href="/transactions" className='w-1/2 mt-3 mx-auto py-2 px-4 rounded-md cursor-pointer bg-black text-white text-center block'>Categorize Transactions</Link>
          </div>
        </div>
      )}

      {!successMessage && (
        <>
          {/* Account Selection */}
          <div className="mb-4">
            <label className="block text-md font-medium mb-2">Account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full p-2 border border-[#282427] rounded-md cursor-pointer"
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
            <label className="block text-md font-medium mb-2">Statement Type</label>
            <select
              value={statementType}
              onChange={(e) => setStatementType(e.target.value as StatementType)}
              className="w-full p-2 border border-[#282427] rounded-md cursor-pointer"
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
            <label className="block text-md font-medium mb-2">PDF Statement</label>
            <label
              htmlFor="pdf-upload"
              className="block text-center w-full p-2 border border-[#282427] rounded-md bg-[#EEEBD9] cursor-pointer hover:bg-[#d7d5c5] text-black"
            >
              {selectedFile ? selectedFile.name : "Select a PDF file..."}
            </label>
            <input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile || !accountId}
            className="w-full bg-[#282427] text-white py-2 px-4 rounded-md cursor-pointer disabled:bg-[#d7d5c5] disabled:text-[#282427] disabled:cursor-not-allowed"
          >
            {uploading ? 'Processing PDF...' : 'Upload Statement'}
          </button>
        </>
      )}
    </div>
  );
}