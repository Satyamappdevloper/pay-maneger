/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Split Calculation Engine Studio
 * Interactive workbench for EQUAL, PERCENTAGE, EXACT_AMOUNT, and SHARES
 */

import React, { useState, useMemo } from 'react';
import { Sliders, CheckCircle2, AlertTriangle, Code2, Users, Coins } from 'lucide-react';
import { SplitType, User } from '../models/types.ts';
import { calculateSplits } from '../engines/splitCalculator.ts';
import { formatCurrency, SUPPORTED_CURRENCIES } from '../engines/currency.ts';

interface SplitCalculatorStudioProps {
  users: User[];
  defaultCurrency: string;
}

export const SplitCalculatorStudio: React.FC<SplitCalculatorStudioProps> = ({
  users,
  defaultCurrency,
}) => {
  const [totalAmount, setTotalAmount] = useState<number>(100);
  const [currency, setCurrency] = useState<string>(defaultCurrency || 'USD');
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [activeUsers, setActiveUsers] = useState<string[]>(users.map((u) => u.id));
  const [customValues, setCustomValues] = useState<Record<string, number>>({});

  // Preset scenarios to click and test quickly
  const loadScenario = (type: 'penny_3' | 'shares_unequal' | 'percentages_odd') => {
    if (type === 'penny_3') {
      setTotalAmount(100);
      setSplitType('EQUAL');
      setActiveUsers(users.slice(0, 3).map((u) => u.id));
    } else if (type === 'shares_unequal') {
      setTotalAmount(250);
      setSplitType('SHARES');
      const uIds = users.slice(0, 4).map((u) => u.id);
      setActiveUsers(uIds);
      setCustomValues({
        [uIds[0]]: 3, // 3 shares
        [uIds[1]]: 2, // 2 shares
        [uIds[2]]: 1, // 1 share
        [uIds[3]]: 1, // 1 share
      });
    } else if (type === 'percentages_odd') {
      setTotalAmount(175.5);
      setSplitType('PERCENTAGE');
      const uIds = users.slice(0, 3).map((u) => u.id);
      setActiveUsers(uIds);
      setCustomValues({
        [uIds[0]]: 50,
        [uIds[1]]: 30,
        [uIds[2]]: 20,
      });
    }
  };

  const toggleUser = (userId: string) => {
    if (activeUsers.includes(userId)) {
      if (activeUsers.length > 1) {
        setActiveUsers(activeUsers.filter((id) => id !== userId));
      }
    } else {
      setActiveUsers([...activeUsers, userId]);
    }
  };

  const calculationResult = useMemo(() => {
    return calculateSplits({
      totalAmount,
      splitType,
      currency,
      memberIds: activeUsers,
      customValues,
    });
  }, [totalAmount, splitType, currency, activeUsers, customValues]);

  const totalCalculated = calculationResult.splits.reduce((acc, s) => acc + s.amount, 0);

  return (
    <div className="space-y-6">
      {/* Preset Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white">Preset Mathematical Stress Scenarios:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadScenario('penny_3')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-lg transition-colors border border-slate-700"
          >
            🪙 $100 / 3 People (Penny Split)
          </button>
          <button
            onClick={() => loadScenario('shares_unequal')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-lg transition-colors border border-slate-700"
          >
            🔢 Weighted Shares (3:2:1:1)
          </button>
          <button
            onClick={() => loadScenario('percentages_odd')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-lg transition-colors border border-slate-700"
          >
            % $175.50 (50% / 30% / 20%)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-400" /> Calculation Parameters
          </h3>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Expense Total Amount</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="any"
                min="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-base font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs font-bold text-white rounded-lg px-3 py-2"
              >
                {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Split Mode Engine</label>
            <div className="grid grid-cols-2 gap-2">
              {(['EQUAL', 'PERCENTAGE', 'EXACT_AMOUNT', 'SHARES'] as SplitType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSplitType(type)}
                  className={`p-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                    splitType === type
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {type === 'EQUAL' && '⚖️ EQUAL'}
                  {type === 'PERCENTAGE' && '% PERCENTAGE'}
                  {type === 'EXACT_AMOUNT' && '$ EXACT_AMOUNT'}
                  {type === 'SHARES' && '🔢 SHARES'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5">
              Select Participants ({activeUsers.length} of {users.length})
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {users.map((u) => {
                const isSelected = activeUsers.includes(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => toggleUser(u.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors border ${
                      isSelected
                        ? 'bg-slate-950 border-emerald-500/40 text-white'
                        : 'bg-slate-950/40 border-slate-800/50 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <img src={u.avatarUrl} alt={u.name} className="w-5 h-5 rounded-full object-cover" />
                      <span>{u.name}</span>
                    </div>
                    <span className="font-mono text-[10px]">
                      {isSelected ? '✓ Active' : '+ Add'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Calculation Output Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Calculated Split Distribution
                </h3>
                <p className="text-xs text-slate-400">
                  Engine dynamically balances remainders to ensure exact sum reconciliation
                </p>
              </div>

              {calculationResult.isValid ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <AlertTriangle className="w-3.5 h-3.5" /> Discrepancy
                </span>
              )}
            </div>

            {/* Error alerts */}
            {calculationResult.errors.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {calculationResult.errors.map((err, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Member splits table */}
            <div className="space-y-2.5">
              {activeUsers.map((uId, idx) => {
                const user = users.find((u) => u.id === uId);
                const split = calculationResult.splits.find((s) => s.userId === uId);
                const amountVal = split?.amount || 0;
                const pctOfTotal = totalAmount > 0 ? ((amountVal / totalAmount) * 100).toFixed(1) : '0';

                return (
                  <div
                    key={uId}
                    className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-500 w-4">#{idx + 1}</span>
                      {user && (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <div className="text-xs font-bold text-white">{user?.name || uId}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {pctOfTotal}% of total expense
                        </div>
                      </div>
                    </div>

                    {/* Inputs based on mode */}
                    <div className="flex items-center gap-3">
                      {splitType === 'PERCENTAGE' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            max="100"
                            placeholder="%"
                            value={customValues[uId] ?? ''}
                            onChange={(e) =>
                              setCustomValues({
                                ...customValues,
                                [uId]: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-16 bg-slate-900 border border-slate-700 text-right px-2 py-1 text-xs text-white rounded font-mono"
                          />
                          <span className="text-xs text-slate-400">%</span>
                        </div>
                      )}

                      {splitType === 'SHARES' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              setCustomValues({
                                ...customValues,
                                [uId]: Math.max(1, (customValues[uId] || 1) - 1),
                              })
                            }
                            className="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs"
                          >
                            -
                          </button>
                          <span className="font-mono text-xs font-bold text-emerald-400 w-6 text-center">
                            {customValues[uId] || 1}
                          </span>
                          <button
                            onClick={() =>
                              setCustomValues({
                                ...customValues,
                                [uId]: (customValues[uId] || 1) + 1,
                              })
                            }
                            className="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs"
                          >
                            +
                          </button>
                          <span className="text-[11px] text-slate-400">shares</span>
                        </div>
                      )}

                      {splitType === 'EXACT_AMOUNT' && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400">$</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={customValues[uId] ?? ''}
                            onChange={(e) =>
                              setCustomValues({
                                ...customValues,
                                [uId]: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-24 bg-slate-900 border border-slate-700 text-right px-2 py-1 text-xs text-white rounded font-mono"
                          />
                        </div>
                      )}

                      <div className="text-right min-w-24">
                        <span className="text-sm font-mono font-extrabold text-emerald-400">
                          {formatCurrency(amountVal, currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reconciliation Footer */}
            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Allocated Sum:</span>
                <span className="font-mono font-bold text-white">
                  {formatCurrency(totalCalculated, currency)}
                </span>
                <span className="text-slate-500">of {formatCurrency(totalAmount, currency)}</span>
              </div>
              <div className="font-mono text-slate-400">
                Rounding Drift:{' '}
                <span className={Math.abs(totalAmount - totalCalculated) < 0.001 ? 'text-emerald-400' : 'text-rose-400'}>
                  {(totalAmount - totalCalculated).toFixed(4)} {currency}
                </span>
              </div>
            </div>
          </div>

          {/* Generated Schema Payload */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                Serialized Engine Output (ExpenseSplit[])
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Ready for DB & Graph</span>
            </div>
            <pre className="text-[11px] font-mono text-slate-300 bg-slate-950 p-3 rounded-lg overflow-x-auto">
              {JSON.stringify(calculationResult.splits, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
