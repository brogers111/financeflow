import { ParsedTransaction } from './types';
import { parseChaseChecking } from './chase-checking';
import { parseChaseSavings } from './chase-personal-savings';
import { parseChaseCreditCard } from './chase-credit-card';
import { parseChaseBusinessSavings } from './chase-business-savings';
import { parseCapitalOneSavings } from './capital-one-savings';

export type AccountType = 
  | 'CHASE_CHECKING'
  | 'CHASE_SAVINGS'
  | 'CHASE_CREDIT'
  | 'CHASE_BUSINESS_SAVINGS'
  | 'CAPITAL_ONE_SAVINGS';

export async function parseStatement(
  buffer: Buffer,
  accountType: AccountType
): Promise<ParsedTransaction[]> {
  switch (accountType) {
    case 'CHASE_CHECKING':
      return parseChaseChecking(buffer);
    case 'CHASE_SAVINGS':
      return parseChaseSavings(buffer);
    case 'CHASE_CREDIT':
      return parseChaseCreditCard(buffer);
    case 'CHASE_BUSINESS_SAVINGS':
      return parseChaseBusinessSavings(buffer);
    case 'CAPITAL_ONE_SAVINGS':
      return parseCapitalOneSavings(buffer);
    default:
      throw new Error(`Unsupported account type: ${accountType}`);
  }
}