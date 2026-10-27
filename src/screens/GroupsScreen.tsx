/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Groups & Friends Management Screen
 * Specification 3: Group Detail, Smart Settlement Section, 4 inner tabs, and Member Management
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Zap,
  Receipt,
  UserPlus,
  Scale,
  History,
  PieChart,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useEqualPay } from '../context/EqualPayContext.tsx';
import { Group, Expense, Debt, GroupCategory } from '../models/types.ts';
import { simplifyDebts, calculateNetBalances } from '../engines/debtSimplifier.ts';
import { formatCurrency, convertCurrency, OFFLINE_FALLBACK_RATES } from '../engines/currency.ts';
import { AddMemberModal } from '../components/AddMemberModal.tsx';

interface GroupsScreenProps {
  onOpenAddExpense: () => void;
  onOpenSettleUpWithDebt: (debt: Debt) => void;
}

export const GroupsScreen: React.FC<GroupsScreenProps> = ({
  onOpenAddExpense,
  onOpenSettleUpWithDebt,
}) => {
  const {
    groups,
    currentGroupId,
    setCurrentGroupId,
    expenses,
    settlements,
    globalCurrency,
    users,
    addMemberToGroup,
    createGroup,
  } = useEqualPay();

  // Active inner tab inside group: Expenses List | Balances & Debts | Settle History | Group Analytics
  const [innerTab, setInnerTab] = useState<
    'expenses' | 'debts' | 'settlements' | 'analytics'
  >('debts');

  // Modal states
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  // New Group Form State
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState<GroupCategory>('Trip');
  const [newGroupCurrency, setNewGroupCurrency] = useState('USD');
  const [newGroupAvatar, setNewGroupAvatar] = useState('🏖️');

  // Find active group
  const activeGroup = useMemo(() => {
    return groups.find((g) => g.id === currentGroupId) || groups[0];
  }, [groups, currentGroupId]);

  // Expenses for active group
  const groupExpenses = useMemo(() => {
    return expenses.filter((e) => e.groupId === activeGroup?.id);
  }, [expenses, activeGroup?.id]);

  // Settlements for active group
  const groupSettlements = useMemo(() => {
    return settlements.filter((s) => s.groupId === activeGroup?.id);
  }, [settlements, activeGroup?.id]);

  // Calculate Net Balances and Simplified Debts using the greedy graph simplification algorithm
  const { simplifiedDebts, netBalances } = useMemo(() => {
    if (!activeGroup) return { simplifiedDebts: [], netBalances: {} };
    const memberIds = activeGroup.members.map((m) => m.id);
    const debts = simplifyDebts(
      groupExpenses,
      memberIds,
      globalCurrency,
      OFFLINE_FALLBACK_RATES
    );
    const balances = calculateNetBalances(
      groupExpenses,
      memberIds,
      globalCurrency,
      OFFLINE_FALLBACK_RATES
    );
    return { simplifiedDebts: debts, netBalances: balances };
  }, [activeGroup, groupExpenses, globalCurrency]);

  const userMap = useMemo(() => {
    return new Map(users.map((u) => [u.id, u]));
  }, [users]);

  // Total expenditure in group converted to globalCurrency
  const totalGroupSpend = useMemo(() => {
    return groupExpenses.reduce((sum, e) => {
      return (
        sum +
        convertCurrency(
          e.totalAmount,
          e.currency,
          globalCurrency,
          OFFLINE_FALLBACK_RATES
        )
      );
    }, 0);
  }, [groupExpenses, globalCurrency]);

  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    createGroup({
      name: newGroupName.trim(),
      category: newGroupCategory,
      defaultCurrency: newGroupCurrency,
      avatarUrl: newGroupAvatar,
      members: [users[0]], // creator starts as member
      description: `Created on ${new Date().toLocaleDateString()}`,
    });

    setNewGroupName('');
    setIsCreateGroupOpen(false);
  };

  if (!activeGroup) {
    return <div className="text-center py-12 text-slate-400">No active groups available.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Group Selector Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs transition-colors">
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
          {groups.map((grp) => {
            const isSelected = grp.id === activeGroup.id;
            return (
              <button
                key={grp.id}
                onClick={() => setCurrentGroupId(grp.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                  isSelected
                    ? 'bg-teal-500/10 dark:bg-teal-500/20 border-teal-600 text-teal-700 dark:text-teal-400 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{grp.avatarUrl || '📁'}</span>
                <span>{grp.name}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setIsCreateGroupOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> New Group
        </button>
      </div>

      {/* Group Detail Card Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center text-3xl shadow-sm">
              {activeGroup.avatarUrl || '📁'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {activeGroup.name}
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {activeGroup.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {activeGroup.description || 'Shared expenses and trip balances'}
              </p>

              {/* Members Avatars with Add Button */}
              <div className="flex items-center gap-1.5 mt-3">
                <div className="flex -space-x-2">
                  {activeGroup.members.map((m) => (
                    <img
                      key={m.id}
                      src={m.avatarUrl}
                      alt={m.name}
                      title={m.name}
                      className="w-7 h-7 rounded-full object-cover border-2 border-white dark:border-slate-900"
                    />
                  ))}
                </div>
                <button
                  onClick={() => setIsAddMemberOpen(true)}
                  className="ml-2 flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                >
                  <UserPlus className="w-3.5 h-3.5" /> + Add Member
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                Total Group Spend
              </span>
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                {formatCurrency(totalGroupSpend, globalCurrency)}
              </span>
            </div>

            <button
              onClick={onOpenAddExpense}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>
        </div>
      </div>

      {/* Smart Settlement Section (Specification 3) */}
      <div className="bg-white dark:bg-slate-900 border border-teal-500/30 rounded-2xl p-5 shadow-xs transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Smart Debt Settlement (Optimal Payment Routes)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Greedy Min-Cash Flow algorithm reduces circular hops to minimum direct payments
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-400">
            {simplifiedDebts.length} Transfers Required
          </span>
        </div>

        <div className="space-y-2.5">
          {simplifiedDebts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2 opacity-80" />
              All balances are settled and even! No payments required.
            </div>
          ) : (
            simplifiedDebts.map((debt, idx) => {
              const fromUser = userMap.get(debt.fromUserId) || {
                name: debt.fromUserId,
                avatarUrl: '',
              };
              const toUser = userMap.get(debt.toUserId) || {
                name: debt.toUserId,
                avatarUrl: '',
              };

              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={fromUser.avatarUrl}
                        alt={fromUser.name}
                        className="w-7 h-7 rounded-full object-cover border border-slate-300 dark:border-slate-700"
                      />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {fromUser.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400 text-xs px-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500">pays</span>
                      <ArrowRight className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    </div>

                    <div className="flex items-center gap-2">
                      <img
                        src={toUser.avatarUrl}
                        alt={toUser.name}
                        className="w-7 h-7 rounded-full object-cover border border-slate-300 dark:border-slate-700"
                      />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {toUser.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-extrabold font-mono text-teal-700 dark:text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-lg">
                      {formatCurrency(debt.amount, debt.currency)}
                    </span>
                    <button
                      onClick={() => onOpenSettleUpWithDebt(debt)}
                      className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg transition-colors"
                    >
                      Settle
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4 Inner Tabs inside Group: [Expenses List] | [Balances & Debts] | [Settle History] | [Group Analytics] */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-colors">
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1.5 text-xs font-bold">
          <button
            onClick={() => setInnerTab('debts')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              innerTab === 'debts'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Scale className="w-3.5 h-3.5" /> Balances & Debts
          </button>
          <button
            onClick={() => setInnerTab('expenses')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              innerTab === 'expenses'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" /> Expenses ({groupExpenses.length})
          </button>
          <button
            onClick={() => setInnerTab('settlements')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              innerTab === 'settlements'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Settle History ({groupSettlements.length})
          </button>
          <button
            onClick={() => setInnerTab('analytics')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              innerTab === 'analytics'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" /> Group Analytics
          </button>
        </div>

        <div className="p-5">
          {/* Inner Tab 1: Balances & Debts */}
          {innerTab === 'debts' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Individual Member Net Balances ({globalCurrency})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeGroup.members.map((member) => {
                  const bal = netBalances[member.id] || 0;
                  const isCreditor = bal > 0.005;
                  const isDebtor = bal < -0.005;

                  return (
                    <div
                      key={member.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={member.avatarUrl}
                          alt={member.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {member.name}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {isCreditor && 'is owed money back'}
                            {isDebtor && 'owes money to group'}
                            {!isCreditor && !isDebtor && 'settled even (0 balance)'}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`text-sm font-bold font-mono px-2.5 py-1 rounded-lg ${
                          isCreditor
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                            : isDebtor
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isCreditor ? '+' : ''}
                        {formatCurrency(bal, globalCurrency)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Inner Tab 2: Expenses List */}
          {innerTab === 'expenses' && (
            <div className="space-y-3">
              {groupExpenses.map((exp) => {
                const payer = userMap.get(exp.paidByUserId) || {
                  name: exp.paidByUserId,
                  avatarUrl: '',
                };
                return (
                  <div
                    key={exp.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {exp.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Paid by {payer.name} • {exp.splitType} • {new Date(exp.date).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                        {formatCurrency(exp.totalAmount, exp.currency)}
                      </div>
                      <div className="text-[10px] font-mono text-teal-600 dark:text-teal-400">
                        ≈ {formatCurrency(
                          convertCurrency(exp.totalAmount, exp.currency, globalCurrency, OFFLINE_FALLBACK_RATES),
                          globalCurrency
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Inner Tab 3: Settle History */}
          {innerTab === 'settlements' && (
            <div className="space-y-3">
              {groupSettlements.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No direct settlement records logged yet for this group.
                </div>
              ) : (
                groupSettlements.map((settle) => {
                  const fromU = userMap.get(settle.fromUserId);
                  const toU = userMap.get(settle.toUserId);
                  return (
                    <div
                      key={settle.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {fromU?.name} paid {toU?.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {settle.method} • {new Date(settle.date).toLocaleDateString()} • {settle.note}
                          </div>
                        </div>
                      </div>

                      <span className="text-xs font-mono font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(settle.amount, settle.currency)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Inner Tab 4: Group Analytics */}
          {innerTab === 'analytics' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Category Expenditure Breakdown
              </h4>
              <div className="space-y-2">
                {['Dining', 'Accommodation', 'Transport', 'Activities', 'Rent', 'Utilities', 'Other'].map(
                  (cat) => {
                    const catExpenses = groupExpenses.filter((e) => e.category === cat);
                    const catSpend = catExpenses.reduce((sum, e) => {
                      return (
                        sum +
                        convertCurrency(
                          e.totalAmount,
                          e.currency,
                          globalCurrency,
                          OFFLINE_FALLBACK_RATES
                        )
                      );
                    }, 0);

                    if (catSpend <= 0) return null;
                    const pct = totalGroupSpend > 0 ? (catSpend / totalGroupSpend) * 100 : 0;

                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {cat}
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {formatCurrency(catSpend, globalCurrency)} ({pct.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        group={activeGroup}
        availableUsers={users}
        onAddMember={addMemberToGroup}
      />

      {/* Create Group Modal */}
      {isCreateGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Create New Group
            </h3>

            <form onSubmit={handleCreateGroupSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ski Chalet Tahoe, Rome Tour 2026"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newGroupCategory}
                    onChange={(e) => setNewGroupCategory(e.target.value as GroupCategory)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Trip">🏖️ Trip</option>
                    <option value="Flat/Rent">🏡 Flat/Rent</option>
                    <option value="Event">🎟️ Event</option>
                    <option value="Office">💼 Office</option>
                    <option value="Home">🏠 Home</option>
                    <option value="Other">📦 Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Emoji Icon
                  </label>
                  <input
                    type="text"
                    value={newGroupAvatar}
                    onChange={(e) => setNewGroupAvatar(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-center text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateGroupOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
