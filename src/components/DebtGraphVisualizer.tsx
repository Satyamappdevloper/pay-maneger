/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Interactive Debt Graph Visualizer
 * Visualizes Peer-to-Peer Raw Debts vs Greedy Min-Cash Flow Simplified Debts
 */

import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, TrendingDown, Users, Zap, ShieldCheck } from 'lucide-react';
import { Debt, Expense, User } from '../models/types.ts';
import { analyzeDebtSimplification } from '../engines/debtSimplifier.ts';
import { formatCurrency, SUPPORTED_CURRENCIES } from '../engines/currency.ts';

interface DebtGraphVisualizerProps {
  expenses: Expense[];
  users: User[];
  baseCurrency: string;
  exchangeRates: Record<string, number>;
  onSettleDebt?: (debt: Debt) => void;
}

export const DebtGraphVisualizer: React.FC<DebtGraphVisualizerProps> = ({
  expenses,
  users,
  baseCurrency,
  exchangeRates,
  onSettleDebt,
}) => {
  const [viewMode, setViewMode] = useState<'simplified' | 'raw' | 'comparison'>('simplified');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('ALL');

  const memberIds = users.map((u) => u.id);
  const userMap = new Map(users.map((u) => [u.id, u]));

  const analysis = analyzeDebtSimplification(expenses, memberIds, baseCurrency, exchangeRates);
  const { simplifiedDebts, rawDebts, netBalances, metrics } = analysis;

  const filteredSimplified = selectedUserFilter === 'ALL'
    ? simplifiedDebts
    : simplifiedDebts.filter((d) => d.fromUserId === selectedUserFilter || d.toUserId === selectedUserFilter);

  const filteredRaw = selectedUserFilter === 'ALL'
    ? rawDebts
    : rawDebts.filter((d) => d.fromUserId === selectedUserFilter || d.toUserId === selectedUserFilter);

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Transaction Reduction</span>
            <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-bold">
              -{metrics.reductionPercentage}%
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{metrics.simplifiedTransactionCount}</span>
            <span className="text-xs text-slate-400 line-through">from {metrics.rawTransactionCount} raw</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {metrics.transactionsEliminated} redundant bank transfers eliminated
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Simplified Volume</span>
            <span className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-bold">
              {metrics.volumeReductionPercentage}% Vol saved
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">
              {formatCurrency(metrics.totalVolumeTransactedSimplified, baseCurrency)}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Raw volume: {formatCurrency(metrics.totalVolumeTransactedRaw, baseCurrency)}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Graph Status</span>
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> Zero-Sum OK
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">Min Cash Flow</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Greedy bipartite bipartite max-matching
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Group Members</span>
            <span className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg text-xs">
              <Users className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">{users.length} People</div>
          <p className="text-xs text-slate-400 mt-1">
            Settling in {baseCurrency} ({SUPPORTED_CURRENCIES[baseCurrency]?.name || baseCurrency})
          </p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setViewMode('simplified')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'simplified'
                ? 'bg-emerald-500 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚡ Simplified Payments ({simplifiedDebts.length})
          </button>
          <button
            onClick={() => setViewMode('comparison')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'comparison'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚖️ Side-by-Side Comparison
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'raw'
                ? 'bg-slate-800 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🕸️ Raw Peer Graph ({rawDebts.length})
          </button>
        </div>

        {/* Member filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Filter person:</span>
          <select
            value={selectedUserFilter}
            onChange={(e) => setSelectedUserFilter(e.target.value)}
            className="bg-slate-950 text-slate-200 border border-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Participants ({users.length})</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'comparison' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Raw Graph Column */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  Raw Unsimplified Debts ({rawDebts.length} Transfers)
                </h3>
                <p className="text-xs text-slate-500">Every direct pairwise peer-to-peer balance</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-mono">
                High friction
              </span>
            </div>
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredRaw.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No raw debt connections</p>
              ) : (
                filteredRaw.map((debt, idx) => (
                  <DebtTransferRow
                    key={`raw_${idx}`}
                    debt={debt}
                    userMap={userMap}
                    isSimplified={false}
                  />
                ))
              )}
            </div>
          </div>

          {/* Simplified Graph Column */}
          <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-5 shadow-lg shadow-emerald-500/5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  EqualPay Min-Flow Optimal Plan ({simplifiedDebts.length} Transfers)
                </h3>
                <p className="text-xs text-emerald-400/80">Mathematical optimum: minimal transaction count</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                Optimal
              </span>
            </div>
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredSimplified.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-medium text-slate-300">All Balances Settled Even!</p>
                  <p className="text-xs text-slate-500">No member owes money.</p>
                </div>
              ) : (
                filteredSimplified.map((debt, idx) => (
                  <DebtTransferRow
                    key={`simp_${idx}`}
                    debt={debt}
                    userMap={userMap}
                    isSimplified={true}
                    onSettle={onSettleDebt}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Single View Mode */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transfers list (2 columns) */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {viewMode === 'simplified' ? (
                    <>
                      <Zap className="w-4 h-4 text-emerald-400" />
                      Smart Settlement Plan
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 text-indigo-400" />
                      Raw Peer-to-Peer Transactions
                    </>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  {viewMode === 'simplified'
                    ? 'Executing these payments settles all accounts with 0 remaining balances'
                    : 'Unoptimized bilateral pairwise obligations'}
                </p>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Showing {viewMode === 'simplified' ? filteredSimplified.length : filteredRaw.length} transfers
              </div>
            </div>

            <div className="space-y-3">
              {(viewMode === 'simplified' ? filteredSimplified : filteredRaw).length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <h4 className="text-white font-semibold">Clean Slate!</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    No debts exist for the current filter selection.
                  </p>
                </div>
              ) : (
                (viewMode === 'simplified' ? filteredSimplified : filteredRaw).map((debt, idx) => (
                  <DebtTransferRow
                    key={idx}
                    debt={debt}
                    userMap={userMap}
                    isSimplified={viewMode === 'simplified'}
                    onSettle={onSettleDebt}
                  />
                ))
              )}
            </div>
          </div>

          {/* Net Balance Board (1 column) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Net Balances</h3>
              <p className="text-xs text-slate-400">Total paid vs owed in {baseCurrency}</p>
            </div>

            <div className="space-y-3">
              {users.map((u) => {
                const balance = netBalances[u.id] || 0;
                const isCreditor = balance > 0.005;
                const isDebtor = balance < -0.005;

                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={u.avatarUrl}
                        alt={u.name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-700"
                      />
                      <div>
                        <div className="text-xs font-semibold text-white">{u.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {isCreditor ? (
                            <span className="text-emerald-400 font-medium">gets back</span>
                          ) : isDebtor ? (
                            <span className="text-rose-400 font-medium">owes</span>
                          ) : (
                            <span className="text-slate-500">settled</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`text-xs font-bold font-mono px-2 py-1 rounded ${
                        isCreditor
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : isDebtor
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isCreditor ? '+' : ''}
                      {formatCurrency(balance, baseCurrency)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Zero-Sum Check:</span>
              <span className="font-mono text-emerald-400">
                0.00 {baseCurrency} invariant
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface DebtTransferRowProps {
  debt: Debt;
  userMap: Map<string, User>;
  isSimplified: boolean;
  onSettle?: (debt: Debt) => void;
}

const DebtTransferRow: React.FC<DebtTransferRowProps> = ({
  debt,
  userMap,
  isSimplified,
  onSettle,
}) => {
  const fromUser = userMap.get(debt.fromUserId) || {
    name: debt.fromUserId,
    avatarUrl: '',
  };
  const toUser = userMap.get(debt.toUserId) || {
    name: debt.toUserId,
    avatarUrl: '',
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all">
      <div className="flex items-center gap-3">
        {/* Debtor */}
        <div className="flex items-center gap-2">
          {fromUser.avatarUrl ? (
            <img
              src={fromUser.avatarUrl}
              alt={fromUser.name}
              className="w-7 h-7 rounded-full object-cover border border-slate-700"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs text-white">
              {fromUser.name.charAt(0)}
            </div>
          )}
          <span className="text-xs font-semibold text-slate-200">{fromUser.name}</span>
        </div>

        {/* Transfer Indicator */}
        <div className="flex items-center gap-1.5 px-2 text-slate-500">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">pays</span>
          <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
        </div>

        {/* Creditor */}
        <div className="flex items-center gap-2">
          {toUser.avatarUrl ? (
            <img
              src={toUser.avatarUrl}
              alt={toUser.name}
              className="w-7 h-7 rounded-full object-cover border border-slate-700"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs text-white">
              {toUser.name.charAt(0)}
            </div>
          )}
          <span className="text-xs font-semibold text-slate-200">{toUser.name}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-extrabold font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
          {formatCurrency(debt.amount, debt.currency)}
        </span>

        {isSimplified && onSettle && (
          <button
            onClick={() => onSettle(debt)}
            className="text-[11px] bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white px-2.5 py-1 rounded transition-colors font-medium"
            title="Mark this payment as settled"
          >
            Settle
          </button>
        )}
      </div>
    </div>
  );
};
