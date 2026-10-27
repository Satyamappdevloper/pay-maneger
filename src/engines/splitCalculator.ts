/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Split Calculation Engine
 * Handles EQUAL, PERCENTAGE, EXACT_AMOUNT, SHARES with penny-perfect reconciliation.
 */

import { ExpenseSplit, SplitType } from '../models/types.ts';
import { roundCurrency } from './currency.ts';

export interface SplitCalculationParams {
  totalAmount: number;
  splitType: SplitType;
  currency: string;
  memberIds: string[];
  customValues?: Record<string, number>; // percentages, exact amounts, or shares per userId
  itemizedItems?: { id: string; name: string; amount: number; assignedUserIds: string[] }[];
}

export interface SplitCalculationResult {
  isValid: boolean;
  splits: ExpenseSplit[];
  errors: string[];
  remainderPennies: number;
}

/**
 * Calculates expense splits ensuring exact reconciliation:
 * sum of all splits strictly equals totalAmount (no missing or extra pennies).
 */
export function calculateSplits(params: SplitCalculationParams): SplitCalculationResult {
  const { totalAmount, splitType, currency, memberIds, customValues = {}, itemizedItems = [] } = params;
  const errors: string[] = [];

  if (memberIds.length === 0) {
    return {
      isValid: false,
      splits: [],
      errors: ['At least one participant must be included in the split.'],
      remainderPennies: 0,
    };
  }

  if (totalAmount <= 0) {
    return {
      isValid: false,
      splits: [],
      errors: ['Total amount must be greater than zero.'],
      remainderPennies: 0,
    };
  }

  const roundedTotal = roundCurrency(totalAmount, currency);

  switch (splitType) {
    case 'EQUAL': {
      const count = memberIds.length;
      const baseShare = Math.floor((roundedTotal / count) * 100) / 100;
      let allocatedSum = roundCurrency(baseShare * count, currency);
      let remainder = roundCurrency(roundedTotal - allocatedSum, currency);

      // Distribute leftover pennies (e.g., $100 / 3 = 33.34, 33.33, 33.33)
      const splits: ExpenseSplit[] = memberIds.map((userId, idx) => {
        let amount = baseShare;
        if (remainder > 0.001) {
          amount = roundCurrency(amount + 0.01, currency);
          remainder = roundCurrency(remainder - 0.01, currency);
        }
        return {
          userId,
          amount: roundCurrency(amount, currency),
        };
      });

      return {
        isValid: true,
        splits,
        errors: [],
        remainderPennies: 0,
      };
    }

    case 'PERCENTAGE': {
      let totalPercentage = 0;
      memberIds.forEach((id) => {
        totalPercentage += customValues[id] || 0;
      });

      // Tolerance for floating percentages like 33.33 + 33.33 + 33.34 = 100
      if (Math.abs(totalPercentage - 100) > 0.05) {
        errors.push(`Total percentage must equal 100% (currently ${totalPercentage.toFixed(2)}%)`);
      }

      let runningSum = 0;
      const splits: ExpenseSplit[] = memberIds.map((userId, index) => {
        const pct = customValues[userId] || 0;
        let amount = 0;
        
        // For the last member, reconcile remainder to guarantee exact sum
        if (index === memberIds.length - 1 && errors.length === 0) {
          amount = roundCurrency(roundedTotal - runningSum, currency);
        } else {
          amount = roundCurrency((roundedTotal * pct) / 100, currency);
          runningSum = roundCurrency(runningSum + amount, currency);
        }

        return {
          userId,
          amount,
          percentage: pct,
        };
      });

      return {
        isValid: errors.length === 0,
        splits,
        errors,
        remainderPennies: 0,
      };
    }

    case 'SHARES': {
      let totalShares = 0;
      memberIds.forEach((id) => {
        totalShares += Math.max(0, customValues[id] || 0);
      });

      if (totalShares <= 0) {
        errors.push('Total shares must be greater than zero.');
        return { isValid: false, splits: [], errors, remainderPennies: 0 };
      }

      let runningSum = 0;
      const splits: ExpenseSplit[] = memberIds.map((userId, index) => {
        const shares = Math.max(0, customValues[userId] || 0);
        let amount = 0;

        if (index === memberIds.length - 1) {
          amount = roundCurrency(roundedTotal - runningSum, currency);
        } else {
          amount = roundCurrency((roundedTotal * shares) / totalShares, currency);
          runningSum = roundCurrency(runningSum + amount, currency);
        }

        return {
          userId,
          amount,
          shares,
        };
      });

      return {
        isValid: true,
        splits,
        errors: [],
        remainderPennies: 0,
      };
    }

    case 'EXACT_AMOUNT': {
      let calculatedSum = 0;
      const splits: ExpenseSplit[] = memberIds.map((userId) => {
        const amount = roundCurrency(customValues[userId] || 0, currency);
        calculatedSum = roundCurrency(calculatedSum + amount, currency);
        return {
          userId,
          amount,
        };
      });

      const difference = roundCurrency(roundedTotal - calculatedSum, currency);
      if (Math.abs(difference) >= 0.01) {
        errors.push(
          `Sum of split amounts (${calculatedSum.toFixed(2)}) does not match total (${roundedTotal.toFixed(2)}). Difference: ${difference.toFixed(2)}`
        );
      }

      return {
        isValid: errors.length === 0,
        splits,
        errors,
        remainderPennies: difference,
      };
    }

    case 'ITEMIZED': {
      if (!itemizedItems || itemizedItems.length === 0) {
        errors.push('Please add at least one line item.');
        return { isValid: false, splits: [], errors, remainderPennies: roundedTotal };
      }

      const userTotals: Record<string, number> = {};
      memberIds.forEach((id) => (userTotals[id] = 0));

      let itemsSum = 0;
      itemizedItems.forEach((item) => {
        itemsSum = roundCurrency(itemsSum + item.amount, currency);
        const assigned = item.assignedUserIds.filter((id) => memberIds.includes(id));
        if (assigned.length > 0) {
          const splitAmount = roundCurrency(item.amount / assigned.length, currency);
          let assignedSum = 0;
          assigned.forEach((uId, idx) => {
            if (idx === assigned.length - 1) {
              const lastAmount = roundCurrency(item.amount - assignedSum, currency);
              userTotals[uId] = roundCurrency((userTotals[uId] || 0) + lastAmount, currency);
            } else {
              userTotals[uId] = roundCurrency((userTotals[uId] || 0) + splitAmount, currency);
              assignedSum = roundCurrency(assignedSum + splitAmount, currency);
            }
          });
        }
      });

      const diff = roundCurrency(roundedTotal - itemsSum, currency);
      if (Math.abs(diff) >= 0.01) {
        errors.push(
          `Item total (${itemsSum.toFixed(2)}) does not match receipt total (${roundedTotal.toFixed(2)}). Difference: ${diff.toFixed(2)}`
        );
      }

      const splits: ExpenseSplit[] = memberIds.map((userId) => ({
        userId,
        amount: userTotals[userId] || 0,
      }));

      return {
        isValid: errors.length === 0,
        splits,
        errors,
        remainderPennies: diff,
      };
    }

    default:
      return {
        isValid: false,
        splits: [],
        errors: [`Unknown split type: ${splitType}`],
        remainderPennies: 0,
      };
  }
}
