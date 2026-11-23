/**
 * Default Indian chart of accounts, seeded per business.
 *
 * Lives here rather than in the accounting controller because the posting
 * service needs it too, and the dependency has to run controller → lib.
 *
 * The codes must stay in step with `ACCOUNTS` in @seed/accounting: postings
 * address accounts by code, so a code here that the postings do not use is
 * harmless, but one they use and this omits makes every posting touching it
 * fail. The two cess accounts were missing for exactly that reason.
 */
export const DEFAULT_COA = [
  // Assets
  { code: '1001', name: 'Cash in Hand', type: 'ASSET' as const, subType: 'CASH' as const },
  { code: '1002', name: 'Bank Accounts', type: 'ASSET' as const, subType: 'BANK' as const },
  { code: '1100', name: 'Trade Receivables', type: 'ASSET' as const, subType: 'ACCOUNTS_RECEIVABLE' as const },
  { code: '1200', name: 'Inventory', type: 'ASSET' as const, subType: 'INVENTORY' as const },
  { code: '1500', name: 'Fixed Assets', type: 'ASSET' as const, subType: 'FIXED_ASSET' as const },
  // Liabilities
  { code: '2100', name: 'Trade Payables', type: 'LIABILITY' as const, subType: 'ACCOUNTS_PAYABLE' as const },
  { code: '2201', name: 'GST Output CGST', type: 'LIABILITY' as const, subType: 'GST_PAYABLE' as const },
  { code: '2202', name: 'GST Output SGST', type: 'LIABILITY' as const, subType: 'GST_PAYABLE' as const },
  { code: '2203', name: 'GST Output IGST', type: 'LIABILITY' as const, subType: 'GST_PAYABLE' as const },
  { code: '2204', name: 'GST Output Cess', type: 'LIABILITY' as const, subType: 'GST_PAYABLE' as const },
  { code: '2211', name: 'GST Input CGST', type: 'LIABILITY' as const, subType: 'GST_PAYABLE' as const },
  { code: '2212', name: 'GST Input SGST', type: 'LIABILITY' as const, subType: 'GST_PAYABLE' as const },
  { code: '2213', name: 'GST Input IGST', type: 'LIABILITY' as const, subType: 'GST_PAYABLE' as const },
  { code: '2214', name: 'GST Input Cess', type: 'LIABILITY' as const, subType: 'GST_PAYABLE' as const },
  { code: '2300', name: 'GR/IR Clearing', type: 'LIABILITY' as const, subType: 'OTHER_LIABILITY' as const },
  // Equity
  { code: '3001', name: 'Owner Equity / Capital', type: 'EQUITY' as const, subType: 'CAPITAL' as const },
  { code: '3100', name: 'Retained Earnings', type: 'EQUITY' as const, subType: 'RETAINED_EARNINGS' as const },
  // Income
  { code: '4001', name: 'Sales Revenue', type: 'INCOME' as const, subType: 'SALES' as const },
  { code: '4002', name: 'Sales Returns', type: 'INCOME' as const, subType: 'SALES' as const },
  { code: '4900', name: 'Other Income', type: 'INCOME' as const, subType: 'OTHER_INCOME' as const },
  // Expenses
  { code: '5001', name: 'Purchases', type: 'EXPENSE' as const, subType: 'PURCHASE' as const },
  { code: '5002', name: 'Purchase Returns', type: 'EXPENSE' as const, subType: 'PURCHASE' as const },
  { code: '5100', name: 'Cost of Goods Sold', type: 'EXPENSE' as const, subType: 'COGS' as const },
  { code: '5200', name: 'Stock Loss / Write-off', type: 'EXPENSE' as const, subType: 'OPERATING_EXPENSE' as const },
  { code: '5300', name: 'Depreciation', type: 'EXPENSE' as const, subType: 'OPERATING_EXPENSE' as const },
  { code: '5400', name: 'Salaries & Wages', type: 'EXPENSE' as const, subType: 'OPERATING_EXPENSE' as const },
  { code: '5500', name: 'Rent', type: 'EXPENSE' as const, subType: 'OPERATING_EXPENSE' as const },
  { code: '5900', name: 'Other Expenses', type: 'EXPENSE' as const, subType: 'OPERATING_EXPENSE' as const },
];
