/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Smart Settlement Engine (Graph Debt Simplification)
 * Technical Specification 2.B
 */

import { Debt, DebtSimplificationResult, Expense } from '../models/types.ts';
import { convertCurrency, roundCurrency, OFFLINE_FALLBACK_RATES } from './currency.ts';

const EPSILON = 0.005; // half a cent threshold for floating-point cleanup

/**
 * Calculates net balance for every member in baseCurrency.
 * Net balance = (Total money paid by user for group) - (Total share owed by user across all expenses).
 * Positive = Creditor (is owed money)
 * Negative = Debtor (owes money)
 */
export function calculateNetBalances(
  expenses: Expense[],
  members: string[],
  baseCurrency: string,
  exchangeRates: Record<string, number> = OFFLINE_FALLBACK_RATES
): Record<string, number> {
  const balances: Record<string, number> = {};

  // Initialize all known members to 0 balance
  members.forEach((mId) => {
    balances[mId] = 0;
  });

  for (const exp of expenses) {
    if (!exp.splits || exp.splits.length === 0) continue;

    // Convert total expense amount to base currency for payer
    const payerConverted = convertCurrency(exp.totalAmount, exp.currency, baseCurrency, exchangeRates);
    balances[exp.paidByUserId] = (balances[exp.paidByUserId] || 0) + payerConverted;

    // Convert and subtract each split
    for (const split of exp.splits) {
      const splitConverted = convertCurrency(split.amount, exp.currency, baseCurrency, exchangeRates);
      balances[split.userId] = (balances[split.userId] || 0) - splitConverted;
    }
  }

  // Round balances to base currency decimals
  let netSum = 0;
  for (const [userId, val] of Object.entries(balances)) {
    const rounded = roundCurrency(val, baseCurrency);
    balances[userId] = rounded;
    netSum += rounded;
  }

  // Zero-sum invariant reconciliation (fix any 1-cent floating point artifact)
  netSum = roundCurrency(netSum, baseCurrency);
  if (Math.abs(netSum) >= 0.01 && members.length > 0) {
    // Find member with highest absolute balance and absorb remainder
    let maxId = members[0];
    let maxAbs = 0;
    for (const id of members) {
      const absVal = Math.abs(balances[id] || 0);
      if (absVal > maxAbs) {
        maxAbs = absVal;
        maxId = id;
      }
    }
    balances[maxId] = roundCurrency(balances[maxId] - netSum, baseCurrency);
  }

  return balances;
}

/**
 * Computes raw unsimplified peer-to-peer debts (each participant owes the payer directly for each expense).
 * If A pays $30 for B and C, B owes A $10, C owes A $10. If later B pays $30 for A and C, A owes B $10, C owes B $10.
 * In a raw graph, this leads to many redundant, circular transactions.
 */
export function calculateRawDebts(
  expenses: Expense[],
  baseCurrency: string,
  exchangeRates: Record<string, number> = OFFLINE_FALLBACK_RATES
): Debt[] {
  // Directed graph accumulator: debtsMap[fromUser][toUser] = amount
  const graph: Record<string, Record<string, number>> = {};

  for (const exp of expenses) {
    const payer = exp.paidByUserId;
    for (const split of exp.splits) {
      if (split.userId === payer) continue; // Payer doesn't owe themselves
      const converted = convertCurrency(split.amount, exp.currency, baseCurrency, exchangeRates);
      if (converted <= 0) continue;

      if (!graph[split.userId]) graph[split.userId] = {};
      graph[split.userId][payer] = (graph[split.userId][payer] || 0) + converted;
    }
  }

  // Compress bilateral pairwise debts (e.g. if A owes B $20 and B owes A $5 -> A owes B $15)
  const result: Debt[] = [];
  const processedPairs = new Set<string>();

  const userIds = Object.keys(graph);
  for (const u1 of userIds) {
    for (const u2 of Object.keys(graph[u1] || {})) {
      const pairKey = [u1, u2].sort().join('::');
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const u1OwesU2 = graph[u1]?.[u2] || 0;
      const u2OwesU1 = graph[u2]?.[u1] || 0;
      const netDebt = roundCurrency(u1OwesU2 - u2OwesU1, baseCurrency);

      if (netDebt > EPSILON) {
        result.push({
          fromUserId: u1,
          toUserId: u2,
          amount: netDebt,
          currency: baseCurrency,
        });
      } else if (netDebt < -EPSILON) {
        result.push({
          fromUserId: u2,
          toUserId: u1,
          amount: Math.abs(netDebt),
          currency: baseCurrency,
        });
      }
    }
  }

  return result;
}

/**
 * Smart Settlement Engine: Graph Debt Simplification Algorithm
 * 
 * Logic:
 * 1. Calculate net balance for each user across all group expenses in baseCurrency.
 * 2. Partition users into Creditors (net balance > 0) and Debtors (net balance < 0).
 * 3. Use a greedy maximum matching heuristic: match the largest debtor with the largest creditor.
 *    This reduces total transaction hops to the minimum required payments (O(N) transactions max).
 * 
 * @param expenses List of group expenses
 * @param members List of all user IDs in the group
 * @param baseCurrency Target currency for settlements
 * @param exchangeRates Currency exchange rate dictionary
 * @returns Array of simplified Debt transactions
 */
export function simplifyDebts(
  expenses: Expense[],
  members: string[],
  baseCurrency: string,
  exchangeRates: Record<string, number> = OFFLINE_FALLBACK_RATES
): Debt[] {
  const netBalances = calculateNetBalances(expenses, members, baseCurrency, exchangeRates);

  interface BalanceEntry {
    userId: string;
    amount: number;
  }

  const creditors: BalanceEntry[] = [];
  const debtors: BalanceEntry[] = [];

  for (const [userId, balance] of Object.entries(netBalances)) {
    if (balance > EPSILON) {
      creditors.push({ userId, amount: balance });
    } else if (balance < -EPSILON) {
      debtors.push({ userId, amount: -balance }); // store as positive amount owed
    }
  }

  // Sort descending by magnitude to prioritize settling largest debts first
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const simplifiedDebts: Debt[] = [];
  let cIndex = 0;
  let dIndex = 0;

  while (cIndex < creditors.length && dIndex < debtors.length) {
    const creditor = creditors[cIndex];
    const debtor = debtors[dIndex];

    const settledAmount = roundCurrency(Math.min(creditor.amount, debtor.amount), baseCurrency);

    if (settledAmount > EPSILON) {
      simplifiedDebts.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount: settledAmount,
        currency: baseCurrency,
      });
    }

    creditor.amount = roundCurrency(creditor.amount - settledAmount, baseCurrency);
    debtor.amount = roundCurrency(debtor.amount - settledAmount, baseCurrency);

    if (creditor.amount <= EPSILON) {
      cIndex++;
    }
    if (debtor.amount <= EPSILON) {
      dIndex++;
    }
  }

  return simplifiedDebts;
}

/**
 * Comprehensive analysis returning both simplified and raw debt graphs with efficiency metrics.
 */
export function analyzeDebtSimplification(
  expenses: Expense[],
  members: string[],
  baseCurrency: string,
  exchangeRates: Record<string, number> = OFFLINE_FALLBACK_RATES
): DebtSimplificationResult {
  const netBalances = calculateNetBalances(expenses, members, baseCurrency, exchangeRates);
  const rawDebts = calculateRawDebts(expenses, baseCurrency, exchangeRates);
  const simplifiedDebts = simplifyDebts(expenses, members, baseCurrency, exchangeRates);

  const rawCount = rawDebts.length;
  const simplifiedCount = simplifiedDebts.length;
  const transactionsEliminated = Math.max(0, rawCount - simplifiedCount);
  const reductionPercentage = rawCount > 0 ? Math.round((transactionsEliminated / rawCount) * 100) : 0;

  const totalVolumeRaw = roundCurrency(
    rawDebts.reduce((sum, d) => sum + d.amount, 0),
    baseCurrency
  );
  const totalVolumeSimplified = roundCurrency(
    simplifiedDebts.reduce((sum, d) => sum + d.amount, 0),
    baseCurrency
  );
  const volumeReductionPercentage =
    totalVolumeRaw > 0
      ? Math.round(((totalVolumeRaw - totalVolumeSimplified) / totalVolumeRaw) * 100)
      : 0;

  return {
    simplifiedDebts,
    rawDebts,
    netBalances,
    metrics: {
      rawTransactionCount: rawCount,
      simplifiedTransactionCount: simplifiedCount,
      transactionsEliminated,
      reductionPercentage,
      totalVolumeTransactedRaw: totalVolumeRaw,
      totalVolumeTransactedSimplified: totalVolumeSimplified,
      volumeReductionPercentage,
    },
    baseCurrency,
  };
}
