/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Analytics & Spending Summary Screen
 */

import React, { useMemo } from 'react';
import {
  PieChart,
  TrendingUp,
  DollarSign,
  Wallet,
  Globe,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useEqualPay } from '../context/EqualPayContext.tsx';
import { formatCurrency, convertCurrency, OFFLINE_FALLBACK_RATES } from '../engines/currency.ts';

export const AnalyticsScreen: React.FC = () => {
  const { expenses, groups, globalCurrency, currentUser } = useEqualPay();

  // Total expenditure across all groups converted to globalCurrency
  const totalVolume = useMemo(() => {
    return expenses.reduce((sum, e) => {
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
  }, [expenses, globalCurrency]);

  // Breakdown by category
  const categoryStats = useMemo(() => {
    const stats: Record<string, { total: number; count: number }> = {};

    expenses.forEach((e) => {
      const converted = convertCurrency(
        e.totalAmount,
        e.currency,
        globalCurrency,
        OFFLINE_FALLBACK_RATES
      );
      if (!stats[e.category]) {
        stats[e.category] = { total: 0, count: 0 };
      }
      stats[e.category].total += converted;
      stats[e.category].count += 1;
    });

    return Object.entries(stats).sort((a, b) => b[1].total - a[1].total);
  }, [expenses, globalCurrency]);

  // Breakdown by currency original transactions
  const currencyStats = useMemo(() => {
    const counts: Record<string, number> = {};
    expenses.forEach((e) => {
      counts[e.currency] = (counts[e.currency] || 0) + 1;
    });
    return Object.entries(counts);
  }, [expenses]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Total Tracked Volume</span>
            <Wallet className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-2">
            {formatCurrency(totalVolume, globalCurrency)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Across {expenses.length} expenses in {groups.length} groups
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Currencies Utilized</span>
            <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-2">
            {currencyStats.length} Global ISOs
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Normalized with institutional offline fallbacks
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Graph Debt Status</span>
            <Zap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-2xl font-black font-mono text-teal-600 dark:text-teal-400 mt-2">
            {expenses.length === 0 ? '100% Even' : 'Optimized'}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {expenses.length === 0
              ? 'Zero outstanding debt across all groups'
              : 'Min Cash Flow algorithm eliminates circular debts'}
          </p>
        </div>
      </div>

      {/* Category Spend Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors space-y-4">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Expenditure by Category
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aggregated spend distribution in {globalCurrency}
            </p>
          </div>

          <div className="space-y-3">
            {categoryStats.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <PieChart className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto opacity-70" />
                <p className="text-xs text-slate-400">No category expenditures recorded yet.</p>
              </div>
            ) : (
              categoryStats.map(([cat, stat]) => {
                const pct = totalVolume > 0 ? (stat.total / totalVolume) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {cat} ({stat.count})
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(stat.total, globalCurrency)} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 dark:bg-teal-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Currency Diversity */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors space-y-4">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              Currency Distribution Across Expenses
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Native currencies entered across groups
            </p>
          </div>

          <div>
            {currencyStats.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <Globe className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto opacity-70" />
                <p className="text-xs text-slate-400">No multi-currency transactions entered yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {currencyStats.map(([curr, count]) => (
                  <div
                    key={curr}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        {curr}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {count} {count === 1 ? 'expense' : 'expenses'}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                      Rate: {OFFLINE_FALLBACK_RATES[curr] || 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
