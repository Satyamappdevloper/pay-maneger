/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Smart Debt & Group Expense Manager
 * Core Data Models & Schemas
 */

export type SplitType = 'EQUAL' | 'PERCENTAGE' | 'EXACT_AMOUNT' | 'SHARES' | 'ITEMIZED';

export type GroupCategory = 'Trip' | 'Home' | 'Flat/Rent' | 'Event' | 'Office' | 'Other';

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  baseCurrency: string;
  avatarUrl: string;
  createdAt: string; // ISOString
}

export interface ExpenseSplit {
  userId: string;
  amount: number;
  percentage?: number;
  shares?: number;
}

export interface ItemizedReceiptItem {
  id: string;
  name: string;
  amount: number;
  assignedUserIds: string[];
}

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  totalAmount: number;
  currency: string;
  paidByUserId: string;
  splitType: SplitType;
  splits: ExpenseSplit[];
  itemizedItems?: ItemizedReceiptItem[];
  date: string; // ISOString
  category: string;
  receiptUrl?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Group {
  id: string;
  name: string;
  category: GroupCategory;
  defaultCurrency: string;
  members: User[];
  createdAt: string; // ISOString
  description?: string;
  avatarUrl?: string;
}

export interface SettlementRecord {
  id: string;
  groupId?: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  method: 'UPI' | 'PayPal' | 'Stripe' | 'Cash' | 'Venmo' | 'Bank Transfer';
  date: string; // ISOString
  note?: string;
}

export interface Debt {
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
}

export interface UserNetBalance {
  userId: string;
  netBalance: number; // positive = is owed money (creditor), negative = owes money (debtor)
  totalPaid: number;
  totalOwed: number;
  currency: string;
}

export interface DebtSimplificationResult {
  simplifiedDebts: Debt[];
  rawDebts: Debt[];
  netBalances: Record<string, number>;
  metrics: {
    rawTransactionCount: number;
    simplifiedTransactionCount: number;
    transactionsEliminated: number;
    reductionPercentage: number;
    totalVolumeTransactedRaw: number;
    totalVolumeTransactedSimplified: number;
    volumeReductionPercentage: number;
  };
  baseCurrency: string;
}

// ---------------------------------------------------------------------------
// Offline Sync Queue & Storage Types
// ---------------------------------------------------------------------------

export type SyncOperationType = 
  | 'CREATE_EXPENSE' 
  | 'UPDATE_EXPENSE' 
  | 'DELETE_EXPENSE' 
  | 'CREATE_GROUP' 
  | 'UPDATE_GROUP'
  | 'SETTLE_DEBT';

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface SyncQueueItem<T = unknown> {
  id: string; // Idempotency key
  entityType: 'expense' | 'group' | 'settlement';
  operation: SyncOperationType;
  entityId: string;
  payload: T;
  timestamp: number;
  status: SyncStatus;
  retryCount: number;
  lastError?: string;
  deviceOrigin: 'web' | 'android' | 'ios';
  schemaVersion: number;
}

export interface IStorageAdapter {
  name: string;
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clear(): Promise<void>;
}

export interface OfflineSyncState {
  isOnline: boolean;
  pendingCount: number;
  lastSyncedAt: number | null;
  syncErrors: Array<{ id: string; error: string; time: number }>;
}

// ---------------------------------------------------------------------------
// Currency Types
// ---------------------------------------------------------------------------

export interface CurrencyMetadata {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  flag: string;
}
