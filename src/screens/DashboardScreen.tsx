/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Dashboard / Home Screen
 * Specification 2: Net Balance Summary Card, Quick Group Grid, and Recent Activity Feed
 */

import React from 'react';
import {
  Plus,
  CheckCircle2,
  Bell,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  ChevronRight,
  TrendingUp,
  Receipt,
  Layers,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useEqualPay } from '../context/EqualPayContext.tsx';
import { formatCurrency, convertCurrency, OFFLINE_FALLBACK_RATES } from '../engines/currency.ts';
import { Expense } from '../models/types.ts';

interface DashboardScreenProps {
  onOpenAddExpense: () => void;
  onOpenSettleUp: () => void;
  onSelectGroup: (groupId: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onOpenAddExpense,
  onOpenSettleUp,
  onSelectGroup,
}) => {
  const {
    currentUser,
    globalCurrency,
    groups,
    expenses,
    userNetBalance,
    userTotalOwedToYou,
    userTotalYouOwe,
    groupBalancesMap,
    remindAllDebtors,
  } = useEqualPay();

  // Sort expenses most recent first
  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 7);

  const isNetPositive = userNetBalance > 0.005;
  const isNetNegative = userNetBalance < -0.005;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Net Balance Summary Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden transition-colors">
        {/* Decorative glow in background */}
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Your Total Net Balance
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                {globalCurrency} Base
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight ${
                  isNetPositive
                    ? 'text-green-600 dark:text-green-400'
                    : isNetNegative
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {isNetPositive ? '+' : ''}
                {formatCurrency(userNetBalance, globalCurrency)}
              </span>
            </div>

            {/* Sub-breakdowns */}
            <div className="mt-4 flex flex-wrap items-center gap-4 sm:gap-6 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              {/* You are owed */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center font-bold">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    You are owed
                  </div>
                  <div className="text-sm font-bold font-mono text-green-600 dark:text-green-400">
                    +{formatCurrency(userTotalOwedToYou, globalCurrency)}
                  </div>
                </div>
              </div>

              {/* You owe */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    You owe
                  </div>
                  <div className="text-sm font-bold font-mono text-red-600 dark:text-red-400">
                    -{formatCurrency(userTotalYouOwe, globalCurrency)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            <button
              onClick={onOpenAddExpense}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>

            <button
              onClick={onOpenSettleUp}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Settle Up</span>
            </button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Hi friends! Friendly settlement reminder from ${currentUser.name} on EqualPay: Please review and settle balances here: https://equalpay.dev/settle?to=${currentUser.id}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-xs"
              title="Share payment reminder directly via WhatsApp"
            >
              <span>💬 WhatsApp Remind</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. Quick Group Cards Carousel / Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Active Groups ({groups.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Overview of group spends and your personal share
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {groups.map((group) => {
            const groupExpenses = expenses.filter((e) => e.groupId === group.id);
            const totalGroupSpend = groupExpenses.reduce((sum, e) => {
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

            const userGroupBal = groupBalancesMap[group.id] || 0;
            const isGroupCreditor = userGroupBal > 0.005;
            const isGroupDebtor = userGroupBal < -0.005;

            return (
              <div
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className="group cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500/50 dark:hover:border-teal-500/50 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shadow-xs">
                      {group.avatarUrl || '📁'}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {group.category}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {group.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    {group.members.length} members • {groupExpenses.length} expenses
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">
                      Your Balance
                    </div>
                    <div
                      className={`text-xs font-bold font-mono ${
                        isGroupCreditor
                          ? 'text-green-600 dark:text-green-400'
                          : isGroupDebtor
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {isGroupCreditor ? '+' : ''}
                      {formatCurrency(userGroupBal, globalCurrency)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">
                      Total Spend
                    </div>
                    <div className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                      {formatCurrency(totalGroupSpend, globalCurrency)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Recent Activity Feed */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Recent Expenses & Activity
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Latest transactions across all groups
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Showing {recentExpenses.length} recent
          </span>
        </div>

        <div className="space-y-2.5">
          {recentExpenses.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No recent expenses recorded yet.
            </div>
          ) : (
            recentExpenses.map((expense) => {
              const payer =
                groups
                  .flatMap((g) => g.members)
                  .find((u) => u.id === expense.paidByUserId) || {
                  name: expense.paidByUserId,
                  avatarUrl: '',
                };

              const userSplit = expense.splits.find((s) => s.userId === currentUser.id);
              const userPaidThis = expense.paidByUserId === currentUser.id;

              return (
                <div
                  key={expense.id}
                  className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 flex flex-wrap items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center text-lg">
                      {expense.category === 'Dining' && '🍽️'}
                      {expense.category === 'Accommodation' && '🏨'}
                      {expense.category === 'Transport' && '🚕'}
                      {expense.category === 'Rent' && '🏡'}
                      {expense.category === 'Utilities' && '💡'}
                      {expense.category === 'Activities' && '🎟️'}
                      {expense.category === 'Settlement' && '🤝'}
                      {!['Dining', 'Accommodation', 'Transport', 'Rent', 'Utilities', 'Activities', 'Settlement'].includes(
                        expense.category
                      ) && '📦'}
                    </div>

                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{expense.title}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-normal">
                          {expense.splitType}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Paid by <strong className="text-slate-700 dark:text-slate-300">{payer.name}</strong> •{' '}
                        {new Date(expense.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Amount and user personal share badge */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                        {formatCurrency(expense.totalAmount, expense.currency)}
                      </div>
                      <div className="text-[10px] font-mono font-semibold">
                        {userPaidThis ? (
                          <span className="text-green-600 dark:text-green-400">
                            You lent {formatCurrency(expense.totalAmount - (userSplit?.amount || 0), expense.currency)}
                          </span>
                        ) : userSplit ? (
                          <span className="text-red-600 dark:text-red-400">
                            Your share: {formatCurrency(userSplit.amount, expense.currency)}
                          </span>
                        ) : (
                          <span className="text-slate-400">Not involved</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
