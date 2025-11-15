import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { buffer, statementType } = await request.json();
    
    // Dynamically import the parser here - this avoids the GraphQL loading issue
    const { parseStatement } = await import('@/lib/parsers/router');
    
    // Convert base64 back to buffer
    const pdfBuffer = Buffer.from(buffer, 'base64');
    
    // Parse the PDF
    const result = await parseStatement(pdfBuffer, statementType as any);
    
    return NextResponse.json({ transactions: result.transactions, endingBalance: result.endingBalance });
  } catch (error) {
    console.error('PDF parsing error:', error);
    return NextResponse.json(
      { error: `Failed to parse PDF: ${error}` },
      { status: 500 }
    );
  }
}