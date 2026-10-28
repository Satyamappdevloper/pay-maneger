/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Clean Data Architecture & Fresh State Models
 * Free of dummy mock groups, mock expenses, and mock activity logs.
 */

import { Group, User, Expense, SettlementRecord } from '../models/types.ts';

export const DEFAULT_USER: User = {
  id: 'user_me',
  name: 'Satyam (You)',
  phone: '+1 (415) 555-0192',
  email: 'satyamthumbnaidesigner@gmail.com',
  baseCurrency: 'USD',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  createdAt: '2026-01-01T00:00:00Z',
};

// Start with only the primary clean user
export const MOCK_USERS: User[] = [DEFAULT_USER];

// Completely empty groups list for a fresh application state
export const MOCK_GROUPS: Group[] = [];

// Completely empty expenses list
export const INITIAL_ALL_EXPENSES: Expense[] = [];

// Completely empty settlements list
export const MOCK_SETTLEMENTS: SettlementRecord[] = [];
