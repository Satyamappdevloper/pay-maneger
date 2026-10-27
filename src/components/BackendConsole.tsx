/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Free-Tier Backend Architecture & Live API Console
 * 100% Free Public APIs, Local Mock Auth, Browser Storage & WhatsApp Deep-Links
 */

import React, { useState, useEffect } from 'react';
import {
  Server,
  Terminal,
  ShieldCheck,
  Send,
  Database,
  Globe,
  Bell,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Code2,
  Key,
  RefreshCw,
  ExternalLink,
  Users,
  UserCheck,
} from 'lucide-react';
import { apiClient } from '../services/apiClient.ts';
import { useEqualPay } from '../context/EqualPayContext.tsx';
import { formatCurrency } from '../engines/currency.ts';

export const BackendConsole: React.FC = () => {
  const { currentUser, setCurrentUser, users, showToast } = useEqualPay();
  const [serverHealth, setServerHealth] = useState<any>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'free_api' | 'auth' | 'currency' | 'schema' | 'reminders'>('free_api');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auth state
  const [loginEmail, setLoginEmail] = useState('alex.rivera@equalpay.dev');
  const [authResponse, setAuthResponse] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Currency API Demo state
  const [currencyBase, setCurrencyBase] = useState('USD');
  const [currencyData, setCurrencyData] = useState<any>(null);
  const [currencyLoading, setCurrencyLoading] = useState(false);

  // Reminder Demo state
  const [reminderAmount, setReminderAmount] = useState('45.00');
  const [reminderResponse, setReminderResponse] = useState<any>(null);
  const [reminderLoading, setReminderLoading] = useState(false);

  // Smoke test runner
  const [smokeTestResults, setSmokeTestResults] = useState<any[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const checkHealth = async () => {
    setIsHealthLoading(true);
    setErrorMessage(null);
    try {
      const data = await apiClient.checkHealth();
      setServerHealth(data);
    } catch (e: any) {
      setServerHealth({ status: 'offline', error: e.message });
      setErrorMessage(`Health check error: ${e.message}`);
    } finally {
      setIsHealthLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleQuickLogin = async (userId: string) => {
    setAuthLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      setAuthResponse(data);
      if (data.user) {
        setCurrentUser(data.user);
        showToast(`Switched active persona to ${data.user.name}`);
      }
    } catch (e: any) {
      setErrorMessage(`Login Error: ${e.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleFetchFreeRates = async () => {
    setCurrencyLoading(true);
    setErrorMessage(null);
    try {
      const data = await apiClient.currency.getRates(currencyBase);
      setCurrencyData(data);
    } catch (e: any) {
      setErrorMessage(`Currency API Error: ${e.message}`);
    } finally {
      setCurrencyLoading(false);
    }
  };

  const handleGenerateReminder = async () => {
    setReminderLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.reminders.sendReminder(
        'user_sarah',
        parseFloat(reminderAmount),
        'USD'
      );
      setReminderResponse(res);
    } catch (e: any) {
      setErrorMessage(`Reminder Error: ${e.message}`);
    } finally {
      setReminderLoading(false);
    }
  };

  const runAllApiSmokeTests = async () => {
    setIsTesting(true);
    setErrorMessage(null);
    const tests = [
      { name: 'GET /api/v1/health', fn: () => apiClient.checkHealth() },
      {
        name: 'POST /api/v1/auth/login (Local Quick Auth)',
        fn: () =>
          fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'user_alex' }),
          }).then((r) => r.json()),
      },
      { name: 'GET /api/v1/groups', fn: () => apiClient.groups.list() },
      {
        name: 'GET /api/v1/currency/rates?base=USD (Open er-api.com)',
        fn: () => apiClient.currency.getRates('USD'),
      },
      {
        name: 'GET /api/v1/groups/group_japan_2026/optimized-debts',
        fn: () => apiClient.groups.getOptimizedDebts('group_japan_2026', 'USD'),
      },
      {
        name: 'POST /api/v1/reminders/send (Free WhatsApp Deep-Link)',
        fn: () => apiClient.reminders.sendReminder('user_sarah', 45, 'USD'),
      },
    ];

    const results = [];
    for (const test of tests) {
      const start = performance.now();
      try {
        const data = await test.fn();
        results.push({
          name: test.name,
          passed: true,
          duration: (performance.now() - start).toFixed(1),
          response: data,
        });
      } catch (err: any) {
        results.push({
          name: test.name,
          passed: false,
          duration: (performance.now() - start).toFixed(1),
          error: err.message,
        });
      }
    }
    setSmokeTestResults(results);
    setIsTesting(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Server className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                EqualPay Free-Tier Architecture & API Explorer
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Zero paid API keys required • Free Open Currency API (<code className="font-mono text-teal-600 dark:text-teal-400">open.er-api.com</code>) • Local Auth • WhatsApp Direct Links
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                serverHealth?.status === 'healthy'
                  ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  serverHealth?.status === 'healthy' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span>Server: {serverHealth?.status || 'Active'}</span>
            </div>

            <button
              onClick={checkHealth}
              disabled={isHealthLoading}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              title="Ping Health"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isHealthLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-2 mt-4 text-xs font-bold">
          <button
            onClick={() => setActiveConsoleTab('free_api')}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              activeConsoleTab === 'free_api'
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            ⚡ Live Endpoints Smoke Test
          </button>
          <button
            onClick={() => setActiveConsoleTab('auth')}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              activeConsoleTab === 'auth'
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            👤 1-Click Persona Switcher
          </button>
          <button
            onClick={() => setActiveConsoleTab('currency')}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              activeConsoleTab === 'currency'
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            🌐 Free Currency Worker (er-api.com)
          </button>
          <button
            onClick={() => setActiveConsoleTab('reminders')}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              activeConsoleTab === 'reminders'
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            💬 Direct WhatsApp Link Generator
          </button>
          <button
            onClick={() => setActiveConsoleTab('schema')}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              activeConsoleTab === 'schema'
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            🗄️ Database & Storage Specs
          </button>
        </div>
      </div>

      {/* Tab 1: Live API Smoke Test */}
      {activeConsoleTab === 'free_api' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Live Zero-Config Endpoints Smoke Test
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tests health, local session login, debt minimization, open currency sync, and WhatsApp link generation
              </p>
            </div>

            <button
              onClick={runAllApiSmokeTests}
              disabled={isTesting}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              {isTesting ? 'Testing Endpoints...' : 'Run All Backend Tests'}
            </button>
          </div>

          <div className="space-y-2.5">
            {smokeTestResults.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Click &ldquo;Run All Backend Tests&rdquo; to test the zero-key Express endpoints in real time.
              </div>
            ) : (
              smokeTestResults.map((r, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {r.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                        {r.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{r.duration}ms</span>
                  </div>

                  {r.response && (
                    <pre className="p-2.5 rounded-lg bg-white dark:bg-slate-900 text-[10px] font-mono text-teal-600 dark:text-teal-400 overflow-x-auto max-h-32 border border-slate-200 dark:border-slate-800">
                      {JSON.stringify(r.response, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: 1-Click Persona Switcher */}
      {activeConsoleTab === 'auth' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Multi-User Testing: 1-Click Persona Switcher
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Switch profiles to test how net balances dynamically flip between creditors and debtors (Zero SMS OTP needed)
              </p>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {users.map((u) => {
                const isActive = currentUser.id === u.id;
                return (
                  <div
                    key={u.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      isActive
                        ? 'bg-teal-500/10 border-teal-500/50 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatarUrl}
                        alt={u.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {isActive && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500 text-white font-bold">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {u.email} • Base {u.baseCurrency}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleQuickLogin(u.id)}
                      disabled={authLoading || isActive}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 cursor-default'
                          : 'bg-teal-600 hover:bg-teal-700 text-white'
                      }`}
                    >
                      {isActive ? 'Current' : 'Switch To'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Active User Session Object
            </h4>
            <pre className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs font-mono text-teal-600 dark:text-teal-400 overflow-x-auto min-h-48 border border-slate-200 dark:border-slate-800">
              {JSON.stringify(authResponse || { activeUser: currentUser }, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 3: Free Currency Worker */}
      {activeConsoleTab === 'currency' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                Free Public Exchange Rates API (`open.er-api.com`)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct integration with `https://open.er-api.com/v6/latest/{currencyBase}` (No secret keys needed)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={currencyBase}
                onChange={(e) => setCurrencyBase(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl px-3 py-1.5 text-slate-900 dark:text-white"
              >
                <option value="USD">USD Base</option>
                <option value="EUR">EUR Base</option>
                <option value="GBP">GBP Base</option>
                <option value="JPY">JPY Base</option>
                <option value="INR">INR Base</option>
                <option value="AED">AED Base</option>
              </select>

              <button
                onClick={handleFetchFreeRates}
                disabled={currencyLoading}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Fetch Open Rates
              </button>
            </div>
          </div>

          <pre className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs font-mono text-teal-600 dark:text-teal-400 overflow-x-auto max-h-72 border border-slate-200 dark:border-slate-800">
            {currencyData
              ? JSON.stringify(currencyData, null, 2)
              : '// Click "Fetch Open Rates" to query live public rates'}
          </pre>
        </div>
      )}

      {/* Tab 4: Direct WhatsApp Link Generator */}
      {activeConsoleTab === 'reminders' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Free WhatsApp Click-to-Chat Link Generator
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Uses client-side `https://wa.me/?text=...` deep-links — 100% free with zero SMS/Twilio costs
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Settlement Amount Owed
                </label>
                <input
                  type="number"
                  value={reminderAmount}
                  onChange={(e) => setReminderAmount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <button
                onClick={handleGenerateReminder}
                disabled={reminderLoading}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Send className="w-3.5 h-3.5" /> Generate WhatsApp Deep-Link
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Direct Link Preview
            </h4>
            {reminderResponse ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                <div className="text-slate-700 dark:text-slate-300">
                  <strong>Message:</strong> &ldquo;{reminderResponse.message}&rdquo;
                </div>
                <div className="pt-2">
                  <a
                    href={reminderResponse.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs"
                  >
                    <span>Open in WhatsApp</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                Click &ldquo;Generate WhatsApp Deep-Link&rdquo; to preview shareable links.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Database & Storage Specs */}
      {activeConsoleTab === 'schema' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Database Architecture (IndexedDB / LocalStorage + Optional Supabase)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Works 100% offline via browser storage with zero mandatory credentials. Supabase / Postgres remain fully supported via optional connection string.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Active Client Storage Engine
              </span>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                Transactions, groups, offline queues, and settlement logs persist locally inside the browser IndexedDB and LocalStorage layers. Zero API keys or cloud database setup required for instant usage!
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-500" /> Optional Supabase Free Tier
              </span>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                To connect a cloud PostgreSQL database, provide the free-tier Supabase connection URI in `.env`:
                <br />
                <code className="text-[10px] text-teal-600 dark:text-teal-400 font-mono">
                  DATABASE_URL=postgresql://postgres:...@db....supabase.co:5432/postgres
                </code>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
