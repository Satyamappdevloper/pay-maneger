/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Typed API Client Service
 * Connects frontend UI components to backend /api/v1 REST endpoints
 */

import { User, Group, Expense, SettlementRecord, Debt } from '../models/types.ts';

const API_BASE = '/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `HTTP ${res.status}: ${res.statusText}`);
    }

    return (await res.json()) as T;
  } catch (error) {
    console.warn(`[API Client Error on ${endpoint}]:`, error);
    throw error;
  }
}

export const apiClient = {
  // Health
  checkHealth: () => request<{ status: string; service: string; timestamp: string }>('/health'),

  // Authentication
  auth: {
    requestOTP: (phone: string) =>
      request<{ success: boolean; message: string; sandboxCode: string }>('/auth/otp', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }),

    verifyOTP: (phone: string, code: string, name?: string) =>
      request<{ success: boolean; token: string; user: User }>('/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code, name }),
      }),

    googleSignIn: (idToken: string, email: string, name: string) =>
      request<{ success: boolean; token: string; user: User }>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken, email, name }),
      }),
  },

  // Users
  users: {
    getMe: () => request<User>('/users/me'),
    updateMe: (updates: Partial<User>) =>
      request<User>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
  },

  // Groups
  groups: {
    list: () => request<Group[]>('/groups'),
    get: (id: string) => request<Group>(`/groups/${id}`),
    create: (data: Partial<Group>) =>
      request<Group>('/groups', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    addMember: (groupId: string, member: Partial<User>) =>
      request<{ group: Group; addedUser: User }>(`/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify(member),
      }),
    getOptimizedDebts: (groupId: string, currency: string) =>
      request<{
        groupId: string;
        baseCurrency: string;
        simplifiedDebts: Debt[];
        netBalances: Record<string, number>;
        transactionCount: number;
      }>(`/groups/${groupId}/optimized-debts?currency=${currency}`),
  },

  // Expenses
  expenses: {
    create: (data: Partial<Expense>) =>
      request<Expense>('/expenses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    listByGroup: (groupId: string) => request<Expense[]>(`/expenses/group/${groupId}`),
  },

  // Settlements
  settlements: {
    create: (data: Partial<SettlementRecord>) =>
      request<SettlementRecord>('/settlements', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Currency
  currency: {
    getRates: (base = 'USD') =>
      request<{
        base: string;
        timestamp: number;
        rates: Record<string, number>;
        source: string;
      }>(`/currency/rates?base=${base}`),
  },

  // Offline Sync Batch
  sync: {
    sendBatch: (items: unknown[], deviceOrigin = 'web') =>
      request<{
        success: boolean;
        processedCount: number;
        results: Array<{ clientSyncId: string; status: string; entityId: string }>;
        syncedAt: string;
      }>('/sync/batch', {
        method: 'POST',
        body: JSON.stringify({ items, deviceOrigin }),
      }),
  },

  // Notifications & Reminders
  reminders: {
    sendReminder: (debtorUserId: string, amount: number, currency: string) =>
      request<{
        success: boolean;
        channel: string;
        recipient: string;
        paymentLink: string;
        message: string;
      }>('/reminders/send', {
        method: 'POST',
        body: JSON.stringify({ debtorUserId, amount, currency, channel: 'WHATSAPP' }),
      }),
  },
};
