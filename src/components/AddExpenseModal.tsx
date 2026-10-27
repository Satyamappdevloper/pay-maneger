/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Advanced Multi-Mode Split Engine Modal (+ Add Expense)
 * Supports EQUAL, UNEQUAL (EXACT_AMOUNT), PERCENTAGE, and ITEMIZED Split Modes
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  AlertCircle,
  Check,
  DollarSign,
  Receipt,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  Paperclip,
  CheckSquare,
  Square,
  Users,
} from 'lucide-react';
import { Expense, SplitType, User, Group, ItemizedReceiptItem } from '../models/types.ts';
import { calculateSplits } from '../engines/splitCalculator.ts';
import { SUPPORTED_CURRENCIES, formatCurrency, roundCurrency } from '../engines/currency.ts';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  activeGroupId: string | null;
  users: User[];
  defaultCurrency: string;
  onSaveExpense: (expense: Expense) => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  groups,
  activeGroupId,
  users,
  defaultCurrency,
  onSaveExpense,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    activeGroupId || groups[0]?.id || ''
  );

  const activeGroup = useMemo(() => {
    return groups.find((g) => g.id === selectedGroupId) || groups[0];
  }, [groups, selectedGroupId]);

  const groupMembers = useMemo(() => {
    return activeGroup ? activeGroup.members : users;
  }, [activeGroup, users]);

  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState<string>('120');
  const [currency, setCurrency] = useState(defaultCurrency || 'USD');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paidByUserId, setPaidByUserId] = useState(groupMembers[0]?.id || users[0]?.id || '');
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    groupMembers.map((m) => m.id)
  );
  const [customValues, setCustomValues] = useState<Record<string, number>>({});
  const [category, setCategory] = useState('Dining');
  const [notes, setNotes] = useState('');
  const [receiptAttached, setReceiptAttached] = useState<boolean>(false);

  // Itemized list state
  const [itemizedList, setItemizedList] = useState<ItemizedReceiptItem[]>([
    {
      id: 'item_1',
      name: 'Main Entrees & Bowls',
      amount: 70,
      assignedUserIds: groupMembers.slice(0, 3).map((m) => m.id),
    },
    {
      id: 'item_2',
      name: 'Artisan Drinks & Coffee',
      amount: 30,
      assignedUserIds: groupMembers.map((m) => m.id),
    },
    {
      id: 'item_3',
      name: 'Dessert Tasting Platter',
      amount: 20,
      assignedUserIds: groupMembers.slice(0, 2).map((m) => m.id),
    },
  ]);

  // Keep paidBy and participants valid when group changes
  const handleGroupChange = (grpId: string) => {
    setSelectedGroupId(grpId);
    const grp = groups.find((g) => g.id === grpId);
    if (grp) {
      const memberIds = grp.members.map((m) => m.id);
      setSelectedUserIds(memberIds);
      if (!memberIds.includes(paidByUserId)) {
        setPaidByUserId(memberIds[0] || users[0].id);
      }
    }
  };

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      if (selectedUserIds.length > 1) {
        setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
      }
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const parsedTotal = parseFloat(totalAmount) || 0;

  // Real-time calculation engine call
  const splitResult = useMemo(() => {
    return calculateSplits({
      totalAmount: parsedTotal,
      splitType,
      currency,
      memberIds: selectedUserIds,
      customValues,
      itemizedItems: splitType === 'ITEMIZED' ? itemizedList : undefined,
    });
  }, [parsedTotal, splitType, currency, selectedUserIds, customValues, itemizedList]);

  // Itemized item actions
  const handleAddItemizedRow = () => {
    const newItem: ItemizedReceiptItem = {
      id: `item_${Date.now()}`,
      name: `Line Item ${itemizedList.length + 1}`,
      amount: 15,
      assignedUserIds: [...selectedUserIds],
    };
    setItemizedList([...itemizedList, newItem]);
  };

  const handleUpdateItemized = (
    id: string,
    field: 'name' | 'amount',
    val: string | number
  ) => {
    setItemizedList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const handleToggleItemUser = (itemId: string, uId: string) => {
    setItemizedList((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const exists = item.assignedUserIds.includes(uId);
        const next = exists
          ? item.assignedUserIds.filter((id) => id !== uId)
          : [...item.assignedUserIds, uId];
        return { ...item, assignedUserIds: next.length > 0 ? next : [uId] };
      })
    );
  };

  const handleDeleteItem = (id: string) => {
    if (itemizedList.length > 1) {
      setItemizedList(itemizedList.filter((i) => i.id !== id));
    }
  };

  // Auto-sync total for itemized mode if requested
  const sumItemizedAmount = useMemo(() => {
    return roundCurrency(
      itemizedList.reduce((acc, i) => acc + (parseFloat(String(i.amount)) || 0), 0),
      currency
    );
  }, [itemizedList, currency]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || parsedTotal <= 0 || !splitResult.isValid) return;

    const newExpense: Expense = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      groupId: selectedGroupId,
      title: title.trim(),
      totalAmount: parsedTotal,
      currency,
      paidByUserId,
      splitType,
      splits: splitResult.splits,
      itemizedItems: splitType === 'ITEMIZED' ? itemizedList : undefined,
      date: new Date(date).toISOString(),
      category,
      notes: notes.trim() || undefined,
      receiptUrl: receiptAttached ? 'https://images.unsplash.com/photo-1554415707-9e4c018a482d?w=300' : undefined,
    };

    onSaveExpense(newExpense);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600/10 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Add New Expense
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-400 font-semibold">
                  EqualPay Engine
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Multi-currency with zero rounding drift
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Group and Title Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Group
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => handleGroupChange(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.avatarUrl || '📁'} {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expense Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Kyoto Kaiseki Dinner, Airport Cab, Sonic Fiber"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
              />
            </div>
          </div>

          {/* Amount, Currency, Date, Category */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Total Amount
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Paid By
              </label>
              <select
                value={paidByUserId}
                onChange={(e) => setPaidByUserId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {groupMembers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>
          </div>

          {/* Split Mode Selector (4 Modes: Equal, Unequal / Exact, Percentage, Itemized) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                Select Split Mechanism
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {splitType === 'EQUAL' && 'Divides evenly with penny allocation'}
                {splitType === 'EXACT_AMOUNT' && 'Unequal custom amount per member'}
                {splitType === 'PERCENTAGE' && 'Custom percentage (100% total)'}
                {splitType === 'ITEMIZED' && 'Item-by-item receipt assignment'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setSplitType('EQUAL')}
                className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition-all text-center flex items-center justify-center gap-1.5 ${
                  splitType === 'EQUAL'
                    ? 'bg-teal-500/10 dark:bg-teal-500/20 border-teal-600 text-teal-700 dark:text-teal-400 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ⚖️ Equal Split
              </button>

              <button
                type="button"
                onClick={() => setSplitType('EXACT_AMOUNT')}
                className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition-all text-center flex items-center justify-center gap-1.5 ${
                  splitType === 'EXACT_AMOUNT'
                    ? 'bg-teal-500/10 dark:bg-teal-500/20 border-teal-600 text-teal-700 dark:text-teal-400 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                💵 Unequal ($)
              </button>

              <button
                type="button"
                onClick={() => setSplitType('PERCENTAGE')}
                className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition-all text-center flex items-center justify-center gap-1.5 ${
                  splitType === 'PERCENTAGE'
                    ? 'bg-teal-500/10 dark:bg-teal-500/20 border-teal-600 text-teal-700 dark:text-teal-400 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                % Percentage
              </button>

              <button
                type="button"
                onClick={() => setSplitType('ITEMIZED')}
                className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition-all text-center flex items-center justify-center gap-1.5 ${
                  splitType === 'ITEMIZED'
                    ? 'bg-sky-500/10 dark:bg-sky-500/20 border-sky-600 text-sky-700 dark:text-sky-400 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🧾 Itemized Receipt
              </button>
            </div>
          </div>

          {/* Mode 4: Itemized Split Builder */}
          {splitType === 'ITEMIZED' ? (
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Receipt Line Items ({itemizedList.length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {Math.abs(sumItemizedAmount - parsedTotal) > 0.01 && (
                    <button
                      type="button"
                      onClick={() => setTotalAmount(sumItemizedAmount.toString())}
                      className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline font-semibold"
                    >
                      Sync Total to {formatCurrency(sumItemizedAmount, currency)}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleAddItemizedRow}
                    className="text-xs px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line Item
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                {itemizedList.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400 w-4">#{idx + 1}</span>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateItemized(item.id, 'name', e.target.value)}
                        placeholder="Dish / Service name"
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400 font-mono">{currency}</span>
                        <input
                          type="number"
                          step="any"
                          value={item.amount}
                          onChange={(e) =>
                            handleUpdateItemized(
                              item.id,
                              'amount',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-20 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white text-right focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded"
                        title="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Member Assignees for this item */}
                    <div className="flex flex-wrap items-center gap-1.5 pl-6">
                      <span className="text-[10px] text-slate-400 font-medium">Split by:</span>
                      {groupMembers.map((m) => {
                        const isAssigned = item.assignedUserIds.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleToggleItemUser(item.id, m.id)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all flex items-center gap-1 border ${
                              isAssigned
                                ? 'bg-sky-500/10 dark:bg-sky-500/20 border-sky-500/40 text-sky-700 dark:text-sky-300'
                                : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-400 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={m.avatarUrl}
                              alt={m.name}
                              className="w-3.5 h-3.5 rounded-full object-cover"
                            />
                            <span>{m.name.split(' ')[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Mode 1, 2, 3: Participant List & Custom Input Matrix */
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Participants ({selectedUserIds.length} of {groupMembers.length})
                </span>
                <span>Calculated Share</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {groupMembers.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  const splitItem = splitResult.splits.find((s) => s.userId === u.id);

                  return (
                    <div
                      key={u.id}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 shadow-xs'
                          : 'bg-slate-100/50 dark:bg-slate-900/30 border-transparent opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleUser(u.id)}
                          className="rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500 dark:bg-slate-950"
                        />
                        <img
                          src={u.avatarUrl}
                          alt={u.name}
                          className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                        <span className="text-xs text-slate-900 dark:text-white font-medium">
                          {u.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Split specific input fields */}
                        {isSelected && splitType === 'PERCENTAGE' && (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="%"
                              value={customValues[u.id] ?? ''}
                              onChange={(e) =>
                                setCustomValues({
                                  ...customValues,
                                  [u.id]: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-right px-1.5 py-1 text-xs text-slate-900 dark:text-white rounded font-mono"
                            />
                            <span className="text-xs text-slate-400">%</span>
                          </div>
                        )}

                        {isSelected && splitType === 'EXACT_AMOUNT' && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-400">$</span>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              placeholder="0.00"
                              value={customValues[u.id] ?? ''}
                              onChange={(e) =>
                                setCustomValues({
                                  ...customValues,
                                  [u.id]: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-20 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-right px-1.5 py-1 text-xs text-slate-900 dark:text-white rounded font-mono font-bold"
                            />
                          </div>
                        )}

                        <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400 min-w-16 text-right">
                          {isSelected && splitItem
                            ? formatCurrency(splitItem.amount, currency)
                            : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Validation Pill / Indicator */}
          {splitResult.errors.length > 0 ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{splitResult.errors[0]}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-400">
              <span className="flex items-center gap-1 font-semibold">
                <Check className="w-3.5 h-3.5" /> Reconciled exactly to {formatCurrency(parsedTotal, currency)}
              </span>
              <span className="font-mono text-slate-500 dark:text-slate-400">0.00 drift</span>
            </div>
          )}

          {/* Category & Receipt Attachment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="Dining">🍽️ Dining & Food</option>
                <option value="Accommodation">🏨 Accommodation / Hotel</option>
                <option value="Transport">🚕 Transport / Flight / Fuel</option>
                <option value="Rent">🏡 Flat Lease / Rent</option>
                <option value="Utilities">💡 Utilities & Fiber Internet</option>
                <option value="Activities">🎟️ Activities & Events</option>
                <option value="Groceries">🛒 Groceries & Supermarket</option>
                <option value="Other">📦 General / Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Receipt Attachment
              </label>
              <button
                type="button"
                onClick={() => setReceiptAttached(!receiptAttached)}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  receiptAttached
                    ? 'bg-teal-500/10 border-teal-600 text-teal-700 dark:text-teal-400'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                }`}
              >
                <Paperclip className="w-3.5 h-3.5" />
                {receiptAttached ? '✓ Receipt Attached (1 photo)' : '+ Attach Photo Receipt'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Split with tip included, booked via Chase Sapphire card"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!splitResult.isValid || parsedTotal <= 0}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" /> Save & Queue Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
