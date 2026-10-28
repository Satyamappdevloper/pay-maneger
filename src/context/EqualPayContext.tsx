/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Central Application State Context
 * Connects all screens, groups, expense calculations, themes, and settlement states.
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Group, User, Expense, SettlementRecord, Debt } from '../models/types.ts';
import { MOCK_USERS, MOCK_GROUPS, INITIAL_ALL_EXPENSES, MOCK_SETTLEMENTS } from '../data/mockData.ts';
import { convertCurrency, OFFLINE_FALLBACK_RATES } from '../engines/currency.ts';
import { calculateNetBalances, simplifyDebts } from '../engines/debtSimplifier.ts';
import { syncQueueInstance } from '../storage/offlineSyncQueue.ts';

export type NavigationTab = 'dashboard' | 'groups' | 'activity' | 'analytics' | 'terms';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

interface EqualPayContextValue {
  // Theme & Appearance
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Active Navigation
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;

  // Identity & Currency
  currentUser: User;
  setCurrentUser: (user: User) => void;
  globalCurrency: string;
  setGlobalCurrency: (currency: string) => void;

  // Data Collections
  users: User[];
  groups: Group[];
  currentGroupId: string | null;
  setCurrentGroupId: (id: string | null) => void;
  expenses: Expense[];
  settlements: SettlementRecord[];

  // Global & Per-Group Balances for Current User
  userNetBalance: number;
  userTotalOwedToYou: number;
  userTotalYouOwe: number;
  groupBalancesMap: Record<string, number>; // groupId -> user balance in that group

  // Network & Sync
  isOnline: boolean;
  toggleSimulatedNetwork: () => void;
  pendingSyncCount: number;

  // Actions
  addExpense: (expense: Expense) => Promise<void>;
  recordSettlement: (settlement: SettlementRecord) => Promise<void>;
  createGroup: (group: Omit<Group, 'id' | 'createdAt'>) => void;
  addMemberToGroup: (groupId: string, user: User) => void;
  remindAllDebtors: () => void;
  updateProfile: (updated: Partial<User>) => void;
  toasts: ToastMessage[];
  showToast: (msg: string, type?: 'success' | 'info' | 'warning') => void;
  dismissToast: (id: string) => void;
}

const EqualPayContext = createContext<EqualPayContextValue | null>(null);

export const EqualPayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state with local persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('equalpay_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true; // Default modern dark theme
  });

  // Apply dark mode class to root HTML
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('equalpay_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('equalpay_theme', 'light');
      }
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  // Navigation
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');

  // Active identity & currency
  const [currentUser, setCurrentUser] = useState<User>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('paymanager_currentUser_v3') || localStorage.getItem('equalpay_currentUser_v2');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.name && !parsed.name.includes('Alex Rivera')) {
            return parsed;
          }
        } catch (e) { /* fallback */ }
      }
    }
    return MOCK_USERS[0];
  });
  const [globalCurrency, setGlobalCurrency] = useState<string>('USD');

  // Data stores with clean local persistence
  const [users, setUsers] = useState<User[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('paymanager_users_v3') || localStorage.getItem('equalpay_users_v2');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((u) => (u.name && u.name.includes('Alex Rivera') ? MOCK_USERS[0] : u));
          }
        } catch (e) { /* fallback */ }
      }
    }
    return MOCK_USERS;
  });

  const [groups, setGroups] = useState<Group[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('equalpay_groups_v2');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { /* fallback */ }
      }
    }
    return [];
  });

  const [currentGroupId, setCurrentGroupId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('equalpay_currentGroupId_v2');
      if (saved) return saved;
    }
    return null;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('equalpay_expenses_v2');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { /* fallback */ }
      }
    }
    return [];
  });

  const [settlements, setSettlements] = useState<SettlementRecord[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('equalpay_settlements_v2');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { /* fallback */ }
      }
    }
    return [];
  });

  // LocalStorage synchronizers
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('equalpay_users_v2', JSON.stringify(users));
    }
  }, [users]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('equalpay_groups_v2', JSON.stringify(groups));
    }
  }, [groups]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (currentGroupId) {
        localStorage.setItem('equalpay_currentGroupId_v2', currentGroupId);
      } else {
        localStorage.removeItem('equalpay_currentGroupId_v2');
      }
    }
  }, [currentGroupId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('equalpay_expenses_v2', JSON.stringify(expenses));
    }
  }, [expenses]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('equalpay_settlements_v2', JSON.stringify(settlements));
    }
  }, [settlements]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('equalpay_currentUser_v2', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  // Network & Sync state
  const [isOnline, setIsOnline] = useState<boolean>(syncQueueInstance.isOnline());
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubQueue = syncQueueInstance.subscribeQueue(() => {
      setPendingSyncCount(syncQueueInstance.getPendingCount());
    });
    const unsubNet = syncQueueInstance.subscribeNetwork((online) => {
      setIsOnline(online);
    });

    return () => {
      unsubQueue();
      unsubNet();
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleSimulatedNetwork = () => {
    const next = !isOnline;
    syncQueueInstance.setSimulatedNetworkStatus(next);
    showToast(
      next ? 'Network reconnected. Syncing queued changes...' : 'Simulating offline mode. Actions will queue locally.',
      next ? 'success' : 'warning'
    );
  };

  // Add Expense with optimistic update and sync queue
  const addExpense = async (newExpense: Expense) => {
    setExpenses((prev) => [newExpense, ...prev]);

    await syncQueueInstance.enqueue(
      'CREATE_EXPENSE',
      'expense',
      newExpense.id,
      newExpense,
      'web'
    );

    showToast(`Added "${newExpense.title}" successfully!`);
  };

  // Record a settlement payment
  const recordSettlement = async (record: SettlementRecord) => {
    setSettlements((prev) => [record, ...prev]);

    // Also create offsetting expense in the group so net balances immediately re-balance
    const fromUser = users.find((u) => u.id === record.fromUserId);
    const toUser = users.find((u) => u.id === record.toUserId);

    const settlementExpense: Expense = {
      id: `exp_settle_${Date.now()}`,
      groupId: record.groupId || groups[0]?.id || 'settlement',
      title: `Settlement: ${fromUser?.name || 'Member'} → ${toUser?.name || 'Member'} (${record.method})`,
      totalAmount: record.amount,
      currency: record.currency,
      paidByUserId: record.fromUserId,
      splitType: 'EXACT_AMOUNT',
      splits: [{ userId: record.toUserId, amount: record.amount }],
      date: record.date,
      category: 'Settlement',
      notes: record.note || `Payment verified via ${record.method}`,
    };

    setExpenses((prev) => [settlementExpense, ...prev]);

    await syncQueueInstance.enqueue(
      'SETTLE_DEBT',
      'settlement',
      record.id,
      record,
      'web'
    );

    showToast(`Recorded ${record.currency} ${record.amount} settlement via ${record.method}.`);
  };

  const createGroup = (newGroupData: Omit<Group, 'id' | 'createdAt'>) => {
    const membersWithCurrentUser = newGroupData.members?.some((m) => m.id === currentUser.id)
      ? newGroupData.members
      : [currentUser, ...(newGroupData.members || [])];

    const newGroup: Group = {
      ...newGroupData,
      id: `group_${Date.now()}`,
      members: membersWithCurrentUser,
      createdAt: new Date().toISOString(),
    };

    // Ensure all group members are registered in users
    const missingUsers = membersWithCurrentUser.filter((m) => !users.some((u) => u.id === m.id));
    if (missingUsers.length > 0) {
      setUsers((prev) => [...prev, ...missingUsers]);
    }

    setGroups((prev) => [newGroup, ...prev]);
    setCurrentGroupId(newGroup.id);
    showToast(`Group "${newGroup.name}" created!`);
  };

  const addMemberToGroup = (groupId: string, newMember: User) => {
    // Add user to global users if new
    if (!users.some((u) => u.id === newMember.id)) {
      setUsers((prev) => [...prev, newMember]);
    }

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          if (g.members.some((m) => m.id === newMember.id)) return g;
          return { ...g, members: [...g.members, newMember] };
        }
        return g;
      })
    );
    showToast(`Added ${newMember.name} to group.`);
  };

  const remindAllDebtors = () => {
    const text = `Hi! Friendly settlement reminder from ${currentUser.name} on Pay Manager. View and settle balances here: https://paymanager.app/settle?to=${currentUser.id}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    showToast(`WhatsApp reminder message copied to clipboard! (Free client-side share)`, 'success');
  };

  const updateProfile = (updated: Partial<User>) => {
    setCurrentUser((prev) => {
      const nextUser = { ...prev, ...updated };
      setUsers((prevUsers) => {
        const idx = prevUsers.findIndex((u) => u.id === nextUser.id);
        if (idx >= 0) {
          const copy = [...prevUsers];
          copy[idx] = nextUser;
          return copy;
        }
        return [...prevUsers, nextUser];
      });
      // Also update any groups containing this member
      setGroups((prevGroups) =>
        prevGroups.map((g) => ({
          ...g,
          members: g.members.map((m) => (m.id === nextUser.id ? { ...m, ...nextUser } : m)),
        }))
      );
      return nextUser;
    });
    showToast('Profile updated successfully!', 'success');
  };

  // Compute Current User's Net Balances across all groups in globalCurrency
  const { userNetBalance, userTotalOwedToYou, userTotalYouOwe, groupBalancesMap } = useMemo(() => {
    let totalOwedToUser = 0; // Positive (others owe you)
    let totalUserOwes = 0;   // Negative (you owe others)
    const gBalances: Record<string, number> = {};

    groups.forEach((grp) => {
      const groupExpenses = expenses.filter((e) => e.groupId === grp.id);
      const memberIds = grp.members.map((m) => m.id);

      // Net balance inside this group in globalCurrency
      const balances = calculateNetBalances(
        groupExpenses,
        memberIds,
        globalCurrency,
        OFFLINE_FALLBACK_RATES
      );

      const userBalInGroup = balances[currentUser.id] || 0;
      gBalances[grp.id] = userBalInGroup;

      if (userBalInGroup > 0) {
        totalOwedToUser += userBalInGroup;
      } else if (userBalInGroup < 0) {
        totalUserOwes += Math.abs(userBalInGroup);
      }
    });

    const netBal = totalOwedToUser - totalUserOwes;

    return {
      userNetBalance: netBal,
      userTotalOwedToYou: totalOwedToUser,
      userTotalYouOwe: totalUserOwes,
      groupBalancesMap: gBalances,
    };
  }, [groups, expenses, currentUser.id, globalCurrency]);

  return (
    <EqualPayContext.Provider
      value={{
        isDarkMode,
        toggleDarkMode,
        activeTab,
        setActiveTab,
        currentUser,
        setCurrentUser,
        globalCurrency,
        setGlobalCurrency,
        users,
        groups,
        currentGroupId,
        setCurrentGroupId,
        expenses,
        settlements,
        userNetBalance,
        userTotalOwedToYou,
        userTotalYouOwe,
        groupBalancesMap,
        isOnline,
        toggleSimulatedNetwork,
        pendingSyncCount,
        addExpense,
        recordSettlement,
        createGroup,
        addMemberToGroup,
        remindAllDebtors,
        updateProfile,
        toasts,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </EqualPayContext.Provider>
  );
};

export const useEqualPay = (): EqualPayContextValue => {
  const context = useContext(EqualPayContext);
  if (!context) {
    throw new Error('useEqualPay must be used within an EqualPayProvider');
  }
  return context;
};
