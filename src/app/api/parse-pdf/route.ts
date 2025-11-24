import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('📄 PDF Parse API called');
  
  try {
    const body = await request.json();
    console.log('📦 Request body keys:', Object.keys(body));
    
    const { fileContent, statementType } = body;
    
    if (!fileContent || !statementType) {
      console.error('❌ Missing fields - fileContent:', !!fileContent, 'statementType:', statementType);
      return NextResponse.json(
        { error: 'Missing required fields: fileContent or statementType' },
        { status: 400 }
      );
    }

    console.log('📋 Statement Type:', statementType);
    console.log('📊 Base64 length:', fileContent.length);
    
    // Dynamically import the parser
    console.log('🔧 Importing parser...');
    const { parseStatement } = await import('@/lib/parsers/router');
    console.log('✅ Parser imported successfully');
    
    // Convert base64 to buffer
    console.log('🔄 Converting base64 to buffer...');
    const pdfBuffer = Buffer.from(fileContent, 'base64');
    console.log('✅ Buffer created, size:', pdfBuffer.length, 'bytes');
    
    // Parse the PDF
    console.log('🚀 Starting PDF parse...');
    const result = await parseStatement(pdfBuffer, statementType as any);
    console.log('✅ Parse successful! Transactions:', result.transactions.length, 'Balance:', result.endingBalance);
    
    return NextResponse.json({ 
      transactions: result.transactions, 
      endingBalance: result.endingBalance 
    });
    
  } catch (error: any) {
    console.error('💥 PDF parsing error:', error);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json(
      { 
        error: `Failed to parse PDF: ${error.message || error}`,
        details: error.stack 
      },
      { status: 500 }
    );
  }
}