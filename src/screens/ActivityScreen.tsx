/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Activity Log Screen
 * Enhanced with comprehensive search bar filtering by Expense Name, User (Payer/Participants), or Amount
 */

import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  X,
  Receipt,
  Download,
  Calendar,
  Layers,
  Users,
  Coins,
  ArrowRight,
  Filter,
  Sparkles,
} from 'lucide-react';
import { useEqualPay } from '../context/EqualPayContext.tsx';
import { formatCurrency, convertCurrency, OFFLINE_FALLBACK_RATES } from '../engines/currency.ts';
import { UserAvatar } from '../components/UserAvatar.tsx';

export const ActivityScreen: React.FC = () => {
  const { expenses, settlements, groups, users, globalCurrency } = useEqualPay();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedGroup, setSelectedGroup] = useState('ALL');

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const groupMap = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  // Combine and enrich activity items with participants, split amounts, and notes
  const activityItems = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'EXPENSE' | 'SETTLEMENT';
      title: string;
      amount: number;
      currency: string;
      date: string;
      payerName: string;
      payerId: string;
      toUserName?: string;
      toUserId?: string;
      groupId?: string;
      category: string;
      splitType?: string;
      notes?: string;
      participants: Array<{ userId: string; name: string; amount: number }>;
    }> = [];

    expenses.forEach((e) => {
      const payer = userMap.get(e.paidByUserId)?.name || e.paidByUserId;
      const participants = e.splits.map((s) => ({
        userId: s.userId,
        name: userMap.get(s.userId)?.name || s.userId,
        amount: s.amount,
      }));

      list.push({
        id: e.id,
        type: 'EXPENSE',
        title: e.title,
        amount: e.totalAmount,
        currency: e.currency,
        date: e.date,
        payerName: payer,
        payerId: e.paidByUserId,
        groupId: e.groupId,
        category: e.category,
        splitType: e.splitType,
        notes: e.notes,
        participants,
      });
    });

    settlements.forEach((s) => {
      const from = userMap.get(s.fromUserId)?.name || s.fromUserId;
      const to = userMap.get(s.toUserId)?.name || s.toUserId;
      list.push({
        id: s.id,
        type: 'SETTLEMENT',
        title: `Settlement: ${from} paid ${to}`,
        amount: s.amount,
        currency: s.currency,
        date: s.date,
        payerName: from,
        payerId: s.fromUserId,
        toUserName: to,
        toUserId: s.toUserId,
        groupId: s.groupId,
        category: 'Settlement',
        notes: s.note,
        participants: [
          { userId: s.fromUserId, name: from, amount: s.amount },
          { userId: s.toUserId, name: to, amount: s.amount },
        ],
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, settlements, userMap]);

  // Comprehensive multi-factor filter: Name, User, Amount, Group, Category
  const filteredItems = useMemo(() => {
    const rawQuery = search.trim();
    const query = rawQuery.toLowerCase();

    // Check if query is an inequality comparator like ">100", ">=50", "<200", "<=80"
    const comparisonMatch = rawQuery.match(/^([><]=?)\s*([0-9]+(\.[0-9]+)?)$/);
    let comparatorOperator: string | null = null;
    let comparatorValue: number | null = null;

    if (comparisonMatch) {
      comparatorOperator = comparisonMatch[1];
      comparatorValue = parseFloat(comparisonMatch[2]);
    }

    return activityItems.filter((item) => {
      // 1. Group & Category matching
      const matchesCategory =
        selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchesGroup =
        selectedGroup === 'ALL' || item.groupId === selectedGroup;

      if (!matchesCategory || !matchesGroup) return false;

      // If search query is empty, match immediately
      if (!rawQuery) return true;

      // 2. Numeric range comparison check (e.g. ">100")
      if (comparatorOperator && comparatorValue !== null) {
        const itemConverted = convertCurrency(
          item.amount,
          item.currency,
          globalCurrency,
          OFFLINE_FALLBACK_RATES
        );
        const amt = item.amount;

        switch (comparatorOperator) {
          case '>':
            return amt > comparatorValue || itemConverted > comparatorValue;
          case '>=':
            return amt >= comparatorValue || itemConverted >= comparatorValue;
          case '<':
            return amt < comparatorValue || itemConverted < comparatorValue;
          case '<=':
            return amt <= comparatorValue || itemConverted <= comparatorValue;
        }
      }

      // 3. Name (Title & Category) match
      const matchesTitle = item.title.toLowerCase().includes(query);
      const matchesCategoryName = item.category.toLowerCase().includes(query);
      const matchesNotes = item.notes?.toLowerCase().includes(query) ?? false;

      // 4. User matching (Payer, Payee, and ALL splitting participants)
      const matchesPayer = item.payerName.toLowerCase().includes(query);
      const matchesToUser = item.toUserName?.toLowerCase().includes(query) ?? false;
      const matchesParticipant = item.participants.some((p) =>
        p.name.toLowerCase().includes(query)
      );

      // 5. Amount matching
      // Clean numeric query (removes '$', '€', '£', '¥', commas, spaces)
      const cleanNumericQuery = query.replace(/[^0-9.]/g, '');
      const itemAmountStr = item.amount.toString();
      const itemFormatted = formatCurrency(item.amount, item.currency).toLowerCase();
      const convertedBase = convertCurrency(
        item.amount,
        item.currency,
        globalCurrency,
        OFFLINE_FALLBACK_RATES
      );
      const convertedFormatted = formatCurrency(convertedBase, globalCurrency).toLowerCase();

      // Check if amount matches directly, formatted, or split participant shares
      const matchesAmountDirect =
        cleanNumericQuery !== '' &&
        (itemAmountStr.includes(cleanNumericQuery) ||
          itemFormatted.includes(query) ||
          convertedFormatted.includes(query));

      const matchesSplitShareAmount =
        cleanNumericQuery !== '' &&
        item.participants.some(
          (p) =>
            p.amount.toString().includes(cleanNumericQuery) ||
            p.amount.toFixed(2).includes(cleanNumericQuery)
        );

      // Currency code match (e.g. "JPY", "EUR", "USD")
      const matchesCurrency = item.currency.toLowerCase().includes(query);

      return (
        matchesTitle ||
        matchesCategoryName ||
        matchesNotes ||
        matchesPayer ||
        matchesToUser ||
        matchesParticipant ||
        matchesAmountDirect ||
        matchesSplitShareAmount ||
        matchesCurrency
      );
    });
  }, [activityItems, search, selectedCategory, selectedGroup, globalCurrency]);

  const handleExportCSV = () => {
    const headers = ['Type', 'Title', 'Amount', 'Currency', 'Date', 'Payer', 'Participants', 'Group', 'Notes'];
    const rows = filteredItems.map((i) => [
      i.type,
      `"${i.title.replace(/"/g, '""')}"`,
      i.amount,
      i.currency,
      i.date,
      `"${i.payerName}"`,
      `"${i.participants.map((p) => p.name).join(', ')}"`,
      `"${groupMap.get(i.groupId || '')?.name || ''}"`,
      `"${(i.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PayManager_Activity_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearAllFilters = () => {
    setSearch('');
    setSelectedCategory('ALL');
    setSelectedGroup('ALL');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Filter Controls Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              Activity & Audit Ledger
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified chronological record with instant multi-factor search
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
              title="Download filtered transactions as CSV"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* Search Bar & Dropdown Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Main Search Input */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by expense name, user (payer/member), or amount (e.g. 'Hotel', 'Sarah', '1200', '>100')..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Group Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="ALL">All Groups ({groups.length})</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.avatarUrl} {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="Dining">🍽️ Dining & Food</option>
              <option value="Accommodation">🏨 Accommodation</option>
              <option value="Transport">🚕 Transport / Flights</option>
              <option value="Rent">🏡 Flat Rent</option>
              <option value="Utilities">💡 Utilities</option>
              <option value="Activities">🎟️ Activities</option>
              <option value="Groceries">🛒 Groceries</option>
              <option value="Settlement">🤝 Settlement</option>
            </select>
          </div>
        </div>

        {/* Quick Search Chips & Filter Shortcuts */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
          <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-teal-600 dark:text-teal-400" />
            Quick search:
          </span>

          {/* User shortcuts */}
          {users.slice(0, 5).map((u) => {
            const isMatch = search.toLowerCase() === u.name.toLowerCase() || search.toLowerCase() === u.name.split(' ')[0].toLowerCase();
            return (
              <button
                key={u.id}
                onClick={() => setSearch(isMatch ? '' : u.name.split(' ')[0])}
                className={`px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                  isMatch
                    ? 'bg-teal-600 text-white border-teal-600 font-bold'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <UserAvatar src={u.avatarUrl} name={u.name} className="w-3.5 h-3.5 rounded-full object-cover" />
                <span>{u.name.split(' ')[0]}</span>
              </button>
            );
          })}

          {/* Amount shortcut chips */}
          <button
            onClick={() => setSearch(search === '>100' ? '' : '>100')}
            className={`px-2 py-0.5 rounded-full border transition-all font-mono ${
              search === '>100'
                ? 'bg-teal-600 text-white border-teal-600 font-bold'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            &gt; $100
          </button>

          <button
            onClick={() => setSearch(search === '>500' ? '' : '>500')}
            className={`px-2 py-0.5 rounded-full border transition-all font-mono ${
              search === '>500'
                ? 'bg-teal-600 text-white border-teal-600 font-bold'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            &gt; $500
          </button>

          <button
            onClick={() => setSearch(search === 'hotel' ? '' : 'hotel')}
            className={`px-2 py-0.5 rounded-full border transition-all ${
              search === 'hotel'
                ? 'bg-teal-600 text-white border-teal-600 font-bold'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            🏨 Hotel
          </button>

          <button
            onClick={() => setSearch(search === 'dining' ? '' : 'dining')}
            className={`px-2 py-0.5 rounded-full border transition-all ${
              search === 'dining'
                ? 'bg-teal-600 text-white border-teal-600 font-bold'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            🍽️ Dining
          </button>

          {(search || selectedCategory !== 'ALL' || selectedGroup !== 'ALL') && (
            <button
              onClick={handleClearAllFilters}
              className="ml-auto text-teal-600 dark:text-teal-400 hover:underline font-bold text-xs"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Meta Banner */}
      <div className="flex items-center justify-between text-xs px-1 text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5 font-medium">
          <span>
            Showing <strong className="text-slate-900 dark:text-white font-mono">{filteredItems.length}</strong> of{' '}
            <span className="font-mono">{activityItems.length}</span> transactions
          </span>
          {search && (
            <span className="text-teal-600 dark:text-teal-400">
              matching &ldquo;<span className="font-semibold">{search}</span>&rdquo;
            </span>
          )}
        </div>

        {search && (
          <span className="text-[11px] text-slate-400">
            Searched across titles, payers, participants & amounts
          </span>
        )}
      </div>

      {/* Timeline List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs transition-colors space-y-3">
        {activityItems.length === 0 ? (
          <div className="py-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                No Activity Logged Yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                As you create groups and record expenses, a verified chronological audit trail of all transactions and settlements will appear here.
              </p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6 opacity-60" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                No matching transactions found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                No transactions matched &ldquo;<span className="font-semibold text-slate-700 dark:text-slate-300">{search}</span>&rdquo;.
                Try searching by a member&apos;s name, amount, or title.
              </p>
            </div>
            <button
              onClick={handleClearAllFilters}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Clear All Search Filters
            </button>
          </div>
        ) : (
          filteredItems.map((item) => {
            const groupName = groupMap.get(item.groupId || '')?.name;
            const isSettlement = item.type === 'SETTLEMENT';

            return (
              <div
                key={item.id}
                className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
              >
                {/* Left Side: Category Icon, Title, Payer & Participants */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-bold text-lg shadow-xs ${
                      isSettlement
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                    }`}
                  >
                    {isSettlement ? '🤝' : '🧾'}
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span>{item.title}</span>
                      {groupName && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                          {groupName}
                        </span>
                      )}
                      {item.splitType && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-700 dark:text-teal-400 font-mono">
                          {item.splitType}
                        </span>
                      )}
                    </div>

                    {/* Payer and Participants Details */}
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>
                        Paid by <strong className="text-slate-700 dark:text-slate-300">{item.payerName}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(item.date).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>

                      {/* Participant tags preview */}
                      {!isSettlement && item.participants.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            {item.participants.length} involved:
                            <span className="text-slate-700 dark:text-slate-300">
                              {item.participants.map((p) => p.name.split(' ')[0]).join(', ')}
                            </span>
                          </span>
                        </>
                      )}

                      {item.notes && (
                        <>
                          <span>•</span>
                          <span className="italic text-slate-400 truncate max-w-xs">&ldquo;{item.notes}&rdquo;</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Original Amount & Converted Base Equivalent */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-800/80 shrink-0">
                  <div className="text-sm sm:text-base font-extrabold font-mono text-slate-900 dark:text-white">
                    {formatCurrency(item.amount, item.currency)}
                  </div>
                  <div className="text-[10px] font-mono text-teal-600 dark:text-teal-400 font-semibold">
                    ≈ {formatCurrency(
                      convertCurrency(item.amount, item.currency, globalCurrency, OFFLINE_FALLBACK_RATES),
                      globalCurrency
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
