import { PostingLine } from './types';

/**
 * Validates that journal entry lines are balanced (total debits == total credits).
 * Throws if not balanced.
 */
export function assertBalanced(lines: PostingLine[]): void {
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  const diff = Math.abs(totalDebit - totalCredit);
  if (diff > 0.001) {
    throw new Error(
      `Journal entry is not balanced: debits=${totalDebit.toFixed(2)}, credits=${totalCredit.toFixed(2)}`,
    );
  }
}

/**
 * Validates all lines have exactly one of debit or credit > 0, not both.
 */
export function assertValidLines(lines: PostingLine[]): void {
  for (const line of lines) {
    if (line.debit < 0 || line.credit < 0) {
      throw new Error('Journal line amounts cannot be negative');
    }
    if (line.debit > 0 && line.credit > 0) {
      throw new Error(
        'A single journal line cannot have both debit and credit > 0',
      );
    }
  }
}
