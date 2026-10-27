/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Multi-Currency Conversion Engine Studio
 * Technical Specification 2.A
 */

import React, { useState } from 'react';
import { RefreshCw, ArrowRightLeft, ShieldAlert, WifiOff, Globe, Check } from 'lucide-react';
import {
  convertCurrency,
  formatCurrency,
  getExchangeRate,
  OFFLINE_FALLBACK_RATES,
  roundCurrency,
  SUPPORTED_CURRENCIES,
} from '../engines/currency.ts';

export const CurrencyEnginePlayground: React.FC = () => {
  const [amount, setAmount] = useState<string>('250');
  const [fromCurrency, setFromCurrency] = useState<string>('USD');
  const [toCurrency, setToCurrency] = useState<string>('EUR');
  const [useOfflineFallback, setUseOfflineFallback] = useState<boolean>(true);
  const [customRates, setCustomRates] = useState<Record<string, number>>({ ...OFFLINE_FALLBACK_RATES });
  const [rateEditCode, setRateEditCode] = useState<string>('EUR');
  const [rateEditValue, setRateEditValue] = useState<string>('0.92');

  const parsedAmount = parseFloat(amount) || 0;
  const activeRates = useOfflineFallback ? OFFLINE_FALLBACK_RATES : customRates;
  const convertedValue = convertCurrency(parsedAmount, fromCurrency, toCurrency, activeRates);
  const directRate = getExchangeRate(fromCurrency, toCurrency, activeRates);
  const inverseRate = getExchangeRate(toCurrency, fromCurrency, activeRates);

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const handleUpdateCustomRate = () => {
    const val = parseFloat(rateEditValue);
    if (!isNaN(val) && val > 0) {
      setCustomRates((prev) => ({
        ...prev,
        [rateEditCode]: val,
      }));
    }
  };

  const handleResetRates = () => {
    setCustomRates({ ...OFFLINE_FALLBACK_RATES });
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-400" />
              Multi-Currency Conversion Engine
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Precision arithmetic with USD triangular arbitrage and robust offline fallback tables
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setUseOfflineFallback(!useOfflineFallback)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                useOfflineFallback
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
            >
              {useOfflineFallback ? (
                <>
                  <WifiOff className="w-3.5 h-3.5" /> Offline Institutional Cache
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" /> Custom Injected Rates
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Converter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center mt-6">
          {/* From Input */}
          <div className="md:col-span-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Source Amount & Currency
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xl font-bold font-mono text-white focus:outline-none focus:border-emerald-500"
              />
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-sm font-bold text-white rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              >
                {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[11px] text-slate-500 mt-2">
              {SUPPORTED_CURRENCIES[fromCurrency]?.name} ({SUPPORTED_CURRENCIES[fromCurrency]?.decimals} decimals)
            </div>
          </div>

          {/* Swap Button */}
          <div className="md:col-span-1 flex justify-center">
            <button
              onClick={handleSwapCurrencies}
              className="p-3 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-full transition-colors border border-slate-700 shadow-sm"
              title="Swap currencies"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* To Converted */}
          <div className="md:col-span-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Converted Result
            </label>
            <div className="flex gap-2 items-center">
              <div className="w-full bg-slate-900/80 border border-slate-800/80 rounded-lg px-3 py-2 text-xl font-extrabold font-mono text-emerald-400">
                {formatCurrency(convertedValue, toCurrency)}
              </div>
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-sm font-bold text-white rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              >
                {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[11px] text-slate-500 mt-2">
              1 {fromCurrency} = {directRate.toFixed(4)} {toCurrency} • 1 {toCurrency} = {inverseRate.toFixed(4)} {fromCurrency}
            </div>
          </div>
        </div>

        {/* Math & Invariant Formula */}
        <div className="mt-4 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <span>
            Formula: crossAmount = (amount / rate[{fromCurrency}]) × rate[{toCurrency}]
          </span>
          <span className="text-emerald-400 font-bold">
            = ({parsedAmount} / {activeRates[fromCurrency] || 1}) × {activeRates[toCurrency] || 1} = {convertedValue}
          </span>
        </div>
      </div>

      {/* Exchange Rate Matrix & Offline Benchmarks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rate Override / Simulation Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Rate Mock & Testing</h3>
            <p className="text-xs text-slate-400">Inject custom exchange rates against USD base</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Target Currency</label>
              <select
                value={rateEditCode}
                onChange={(e) => {
                  setRateEditCode(e.target.value);
                  setRateEditValue((customRates[e.target.value] || 1).toString());
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              >
                {Object.keys(activeRates).map((code) => (
                  <option key={code} value={code}>
                    {code} (Current: {activeRates[code]})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Exchange Rate (1 USD = ?)</label>
              <input
                type="number"
                step="any"
                value={rateEditValue}
                onChange={(e) => setRateEditValue(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleUpdateCustomRate}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded-lg text-xs transition-colors"
              >
                Apply Custom Rate
              </button>
              <button
                onClick={handleResetRates}
                className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2 rounded-lg text-xs transition-colors"
                title="Reset to official offline defaults"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Offline Guarantee
            </div>
            <p>
              When network requests time out or fail on mobile devices, EqualPay guarantees zero transaction blocks
              by employing built-in currency rate snapshots.
            </p>
          </div>
        </div>

        {/* Global Rates Reference Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Active Rates Table (Pegeed to 1 USD)</h3>
              <p className="text-xs text-slate-400">Triangular base unit: 1.0000 USD</p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {Object.keys(activeRates).length} Currencies
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
            {Object.entries(activeRates).map(([code, rate]) => {
              const meta = SUPPORTED_CURRENCIES[code];
              const isModified = customRates[code] !== OFFLINE_FALLBACK_RATES[code];

              return (
                <div
                  key={code}
                  className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{meta?.flag || '🌐'}</span>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        {code}
                        {isModified && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Custom rate override" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">{meta?.symbol || code}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-emerald-400">
                      {rate.toFixed(code === 'JPY' ? 1 : 4)}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono">per USD</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
