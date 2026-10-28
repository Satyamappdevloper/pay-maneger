/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Settle Up & Payment Modal
 * Specification 5: Payer/Payee selection, balance calculation, partial/full settlement & local payment links
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  QrCode,
  DollarSign,
  Send,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { User, SettlementRecord, Debt } from '../models/types.ts';
import { formatCurrency, SUPPORTED_CURRENCIES } from '../engines/currency.ts';

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUserId: string;
  defaultPayerId?: string;
  defaultPayeeId?: string;
  suggestedDebts?: Debt[];
  globalCurrency: string;
  onConfirmSettlement: (record: SettlementRecord) => void;
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUserId,
  defaultPayerId,
  defaultPayeeId,
  suggestedDebts = [],
  globalCurrency,
  onConfirmSettlement,
}) => {
  const [payerId, setPayerId] = useState<string>(defaultPayerId || currentUserId);
  const [payeeId, setPayeeId] = useState<string>(
    defaultPayeeId || users.find((u) => u.id !== currentUserId)?.id || users[1]?.id || ''
  );
  const [amount, setAmount] = useState<string>('50');
  const [currency, setCurrency] = useState<string>(globalCurrency || 'USD');
  const [paymentMethod, setPaymentMethod] = useState<
    'UPI' | 'PayPal' | 'Stripe' | 'Venmo' | 'Cash' | 'Bank Transfer'
  >('UPI');
  const [note, setNote] = useState<string>('Pay Manager Debt Settlement');
  const [showQR, setShowQR] = useState<boolean>(false);

  // Auto-calculate suggested debt between chosen payer and payee
  const matchedDebt = useMemo(() => {
    return suggestedDebts.find(
      (d) => d.fromUserId === payerId && d.toUserId === payeeId
    );
  }, [suggestedDebts, payerId, payeeId]);

  // If debt is found, allow 1-click fill
  const handleAutoFillDebt = (debtAmount: number) => {
    setAmount(debtAmount.toString());
  };

  const payer = users.find((u) => u.id === payerId);
  const payee = users.find((u) => u.id === payeeId);

  if (!isOpen) return null;

  if (users.length <= 1) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto text-2xl shadow-xs">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              All Settled Even!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              No debts found to settle. Add friends and members to your groups and record shared expenses to track balances and settle up here.
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-md transition-all cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || payerId === payeeId) return;

    const record: SettlementRecord = {
      id: `settle_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fromUserId: payerId,
      toUserId: payeeId,
      amount: parsedAmount,
      currency,
      method: paymentMethod,
      date: new Date().toISOString(),
      note: note.trim() || undefined,
    };

    onConfirmSettlement(record);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Settle Up Debt
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct settlement recording & instant payment links
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Payer and Payee Selection Cards */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Who is Paying?
                </label>
                <select
                  value={payerId}
                  onChange={(e) => setPayerId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-teal-500"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Recipient (Payee)
                </label>
                <select
                  value={payeeId}
                  onChange={(e) => setPayeeId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-teal-500"
                >
                  {users
                    .filter((u) => u.id !== payerId)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Visual Flow Arrow */}
            <div className="flex items-center justify-between text-xs pt-1 px-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {payer?.name}
              </span>
              <div className="flex items-center gap-1 text-teal-600 dark:text-teal-400 font-mono text-[11px] font-bold">
                pays <ArrowRight className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {payee?.name}
              </span>
            </div>

            {/* Suggested Debt Match Banner */}
            {matchedDebt && (
              <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-lg flex items-center justify-between text-xs text-teal-700 dark:text-teal-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Zap className="w-3.5 h-3.5" /> Outstanding balance: {formatCurrency(matchedDebt.amount, matchedDebt.currency)}
                </span>
                <button
                  type="button"
                  onClick={() => handleAutoFillDebt(matchedDebt.amount)}
                  className="font-bold underline text-xs hover:text-teal-800 dark:hover:text-teal-300"
                >
                  Fill Full Balance
                </button>
              </div>
            )}
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Settlement Amount
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-lg font-bold font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
              >
                {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Payment Rails / Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['UPI', 'PayPal', 'Stripe', 'Venmo', 'Cash', 'Bank Transfer'] as const).map(
                (method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                      paymentMethod === method
                        ? 'bg-teal-500/10 border-teal-600 text-teal-700 dark:text-teal-400 font-bold shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {method}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Quick Payment Deep-Links & QR simulation */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                Launch Deep-Link
              </span>
              <button
                type="button"
                onClick={() => setShowQR(!showQR)}
                className="text-xs text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1 hover:underline"
              >
                <QrCode className="w-3.5 h-3.5" /> {showQR ? 'Hide QR' : 'Show Pay QR'}
              </button>
            </div>

            {showQR && (
              <div className="py-3 text-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="w-28 h-28 mx-auto bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center border border-slate-300 dark:border-slate-700">
                  <QrCode className="w-20 h-20 text-slate-900 dark:text-white" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-mono">
                  Scan to pay {formatCurrency(parseFloat(amount) || 0, currency)} to {payee?.name}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Hi ${payee?.name}! I'm sending a settlement payment of ${currency} ${amount} on Pay Manager: https://paymanager.app/settle?to=${payee?.id}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="py-2 text-center text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>💬 WhatsApp Share</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <a
                href={`upi://pay?pa=paymanager.${payeeId}@bank&pn=${encodeURIComponent(
                  payee?.name || ''
                )}&am=${amount}&cu=${currency}`}
                onClick={(e) => {
                  e.preventDefault();
                  alert(`[Demo Mode] Simulated opening UPI / Pay app for ${payee?.name} ($${amount})`);
                }}
                className="py-2 text-center text-[11px] font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors flex items-center justify-center gap-1 shadow-xs"
              >
                <span>UPI Pay</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <a
                href={`https://paypal.me/equalpay/${amount}${currency}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  alert(`[Demo Mode] Simulated redirecting to PayPal checkout for ${payee?.name}`);
                }}
                className="py-2 text-center text-[11px] font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center gap-1 shadow-xs col-span-2 sm:col-span-1"
              >
                <span>PayPal.me</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Settlement Note
            </label>
            <input
              type="text"
              placeholder="e.g. Paid via Google Pay #UPI-8492"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={payerId === payeeId || !amount || parseFloat(amount) <= 0}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white transition-all shadow-md active:scale-95"
            >
              <Send className="w-3.5 h-3.5" /> Confirm Settlement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
