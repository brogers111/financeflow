import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OLLAMA_API = 'http://localhost:11434/api/generate';

interface CategorizationResult {
  categoryId: string | null;
  confidence: number;
  reasoning?: string;
}

/**
 * Categorize a single transaction using Ollama AI
 * First checks learned patterns, then uses AI if needed
 */
export async function categorizeWithOllama(
  description: string,
  amount: number
): Promise<CategorizationResult> {
  
  // First, check if we've seen this exact description before
  const pattern = await prisma.categorizationPattern.findUnique({
    where: { descriptionPattern: description.toUpperCase() }
  });
  
  if (pattern && pattern.confidence > 0.8) {
    return {
      categoryId: pattern.categoryId,
      confidence: pattern.confidence,
      reasoning: 'Learned from previous categorizations'
    };
  }
  
  // Get all categories for the transaction type
  const categories = await prisma.category.findMany({
    where: { type: amount < 0 ? 'EXPENSE' : 'INCOME' }
  });
  
  if (categories.length === 0) {
    return { categoryId: null, confidence: 0, reasoning: 'No categories available' };
  }
  
  const categoryList = categories.map(c => `${c.name} (ID: ${c.id})`).join(', ');
  
  const prompt = `You are a financial transaction categorizer. Given a transaction description and amount, determine the most appropriate category.

Transaction: "${description}"
Amount: $${Math.abs(amount)}
Type: ${amount < 0 ? 'EXPENSE' : 'INCOME'}

Available categories: ${categoryList}

Respond in JSON format ONLY:
{
  "category_id": "uuid-of-best-matching-category",
  "confidence": 0.85,
  "reasoning": "brief explanation"
}

If you cannot confidently categorize (confidence < 0.6), set category_id to null.`;

  try {
    const response = await fetch(OLLAMA_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt,
        stream: false,
        format: 'json'
      })
    });
    
    if (!response.ok) {
      console.error('Ollama API error:', response.statusText);
      return { categoryId: null, confidence: 0 };
    }
    
    const data = await response.json();
    const result = JSON.parse(data.response);
    
    return {
      categoryId: result.category_id || null,
      confidence: result.confidence || 0,
      reasoning: result.reasoning
    };
    
  } catch (error) {
    console.error('Error calling Ollama:', error);
    return { categoryId: null, confidence: 0 };
  }
}

/**
 * Categorize multiple transactions in batches
 * Limits concurrency to avoid overwhelming Ollama
 */
export async function categorizeBatch(
  transactions: Array<{ description: string; amount: number }>
): Promise<CategorizationResult[]> {
  const BATCH_SIZE = 5;
  const results: CategorizationResult[] = [];
  
  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(t => categorizeWithOllama(t.description, t.amount))
    );
    results.push(...batchResults);
  }
  return results;
}