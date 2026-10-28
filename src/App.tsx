/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Lead Cross-Platform UI/UX Layout & App Shell
 * Specification 1-5: Desktop Sidebar, Mobile Bottom Bar, Dark/Light Mode, Global Currency, and State Integration
 */

import React, { useState } from 'react';
import {
  Wallet,
  Home,
  Users,
  History,
  PieChart,
  FileText,
  Plus,
  CheckCircle2,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  Bell,
  ChevronDown,
  Layers,
  Sparkles,
  Zap,
  Edit3,
} from 'lucide-react';

import { EqualPayProvider, useEqualPay, NavigationTab } from './context/EqualPayContext.tsx';
import { SUPPORTED_CURRENCIES, formatCurrency } from './engines/currency.ts';
import { Debt, Expense, SettlementRecord } from './models/types.ts';

// Screens
import { DashboardScreen } from './screens/DashboardScreen.tsx';
import { GroupsScreen } from './screens/GroupsScreen.tsx';
import { ActivityScreen } from './screens/ActivityScreen.tsx';
import { AnalyticsScreen } from './screens/AnalyticsScreen.tsx';
import { TermsScreen } from './screens/TermsScreen.tsx';

// Modals
import { AddExpenseModal } from './components/AddExpenseModal.tsx';
import { SettleUpModal } from './components/SettleUpModal.tsx';
import { EditProfileModal } from './components/EditProfileModal.tsx';
import { UserAvatar } from './components/UserAvatar.tsx';

function EqualPayAppContent() {
  const {
    isDarkMode,
    toggleDarkMode,
    activeTab,
    setActiveTab,
    currentUser,
    setCurrentUser,
    globalCurrency,
    setGlobalCurrency,
    groups,
    currentGroupId,
    setCurrentGroupId,
    users,
    expenses,
    isOnline,
    toggleSimulatedNetwork,
    pendingSyncCount,
    addExpense,
    recordSettlement,
    updateProfile,
    toasts,
    showToast,
    dismissToast,
  } = useEqualPay();

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSettleUpOpen, setIsSettleUpOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [settleDebtPreset, setSettleDebtPreset] = useState<Debt | undefined>(undefined);


  const handleOpenSettleWithDebt = (debt: Debt) => {
    setSettleDebtPreset(debt);
    setIsSettleUpOpen(true);
  };

  const handleOpenGeneralSettle = () => {
    setSettleDebtPreset(undefined);
    setIsSettleUpOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors selection:bg-teal-500/20 selection:text-teal-700 dark:selection:text-teal-300">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => dismissToast(toast.id)}
            className={`pointer-events-auto p-3.5 rounded-2xl shadow-xl border flex items-center justify-between gap-3 text-xs font-bold animate-in slide-in-from-top duration-200 cursor-pointer ${
              toast.type === 'success'
                ? 'bg-teal-600 text-white border-teal-500'
                : toast.type === 'warning'
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 shrink-0" />
              <span>{toast.message}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 1. TOP HEADER (Specification 1) */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600 dark:bg-teal-500 text-white dark:text-slate-950 flex items-center justify-center font-black shadow-md shadow-teal-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                  Pay Manager
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold border border-teal-500/20">
                  Global
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Smart Debt & Group Expense Manager
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Global Currency Selector Dropdown (USD, INR, EUR, AED, GBP, JPY, etc.) */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] hidden sm:inline">
                Currency:
              </span>
              <select
                value={globalCurrency}
                onChange={(e) => setGlobalCurrency(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-teal-400 font-bold focus:outline-none text-xs font-mono cursor-pointer"
              >
                {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {c.flag} {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            {/* Offline / Online Sync Status Indicator Dot */}
            <button
              onClick={toggleSimulatedNetwork}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isOnline
                  ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
              }`}
              title={
                isOnline
                  ? 'Online & Connected. Click to simulate Offline / Airplane Mode.'
                  : 'Offline (Mutations queued locally). Click to reconnect.'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="hidden sm:inline text-[11px]">
                {isOnline ? 'Online' : 'Offline'}
              </span>
              {pendingSyncCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center">
                  {pendingSyncCount}
                </span>
              )}
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Terms & Conditions Header Quick Link */}
            <button
              onClick={() => setActiveTab('terms')}
              className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-bold ${
                activeTab === 'terms'
                  ? 'bg-teal-600 text-white border-teal-500 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
              title="Terms & Conditions and Privacy Policy"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden lg:inline text-[11px]">Terms</span>
            </button>

            {/* User Profile / Persona Switcher & Customizer */}
            <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(true)}
                className="relative group cursor-pointer focus:outline-none"
                title="Click to customize your profile"
              >
                <UserAvatar
                  src={currentUser.avatarUrl}
                  name={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover border-2 border-teal-600/30 group-hover:border-teal-500 transition-colors"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-teal-600 text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-xs">
                  ✎
                </span>
              </button>
              <select
                value={currentUser.id}
                onChange={(e) => {
                  const u = users.find((usr) => usr.id === e.target.value);
                  if (u) {
                    setCurrentUser(u);
                    showToast(`Switched active persona to ${u.name}`);
                  }
                }}
                className="bg-transparent text-xs font-bold text-slate-900 dark:text-white cursor-pointer focus:outline-none max-w-[85px] sm:max-w-[130px] truncate"
                title="Switch active user persona"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {u.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Edit profile name & preferences"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Container (Sidebar on Desktop + Main Screen Area) */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex gap-6">
        {/* DESKTOP SIDEBAR (Specification 1) */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs space-y-1 transition-colors">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === 'dashboard'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('groups')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === 'groups'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Groups & Friends</span>
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === 'activity'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Activity Log</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === 'analytics'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>Analytics</span>
            </button>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setActiveTab('terms')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  activeTab === 'terms'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Terms & Conditions</span>
              </button>
            </div>
          </div>

          {/* Quick Primary CTA */}
          <div className="space-y-2">
            <button
              onClick={() => setIsAddExpenseOpen(true)}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>

            <button
              onClick={handleOpenGeneralSettle}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Settle Up</span>
            </button>
          </div>
        </aside>

        {/* MAIN BODY AREA */}
        <main className="flex-1 min-w-0 pb-20 md:pb-6">
          {/* Tab 1: Dashboard */}
          {activeTab === 'dashboard' && (
            <DashboardScreen
              onOpenAddExpense={() => setIsAddExpenseOpen(true)}
              onOpenSettleUp={handleOpenGeneralSettle}
              onSelectGroup={(gId) => {
                setCurrentGroupId(gId);
                setActiveTab('groups');
              }}
              onOpenCreateGroup={() => setActiveTab('groups')}
            />
          )}

          {/* Tab 2: Groups & Friends */}
          {activeTab === 'groups' && (
            <GroupsScreen
              onOpenAddExpense={() => setIsAddExpenseOpen(true)}
              onOpenSettleUpWithDebt={handleOpenSettleWithDebt}
            />
          )}

          {/* Tab 3: Activity Log */}
          {activeTab === 'activity' && <ActivityScreen />}

          {/* Tab 4: Analytics */}
          {activeTab === 'analytics' && <AnalyticsScreen />}

          {/* Tab 5: Terms & Conditions & Privacy */}
          {activeTab === 'terms' && <TermsScreen />}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (Specification 1) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-around">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 p-1 text-[10px] font-bold ${
            activeTab === 'dashboard'
              ? 'text-teal-600 dark:text-teal-400'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`flex flex-col items-center gap-1 p-1 text-[10px] font-bold ${
            activeTab === 'groups'
              ? 'text-teal-600 dark:text-teal-400'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>Groups</span>
        </button>

        {/* Floating Action Center Button */}
        <button
          onClick={() => setIsAddExpenseOpen(true)}
          className="-mt-5 w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30 active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex flex-col items-center gap-1 p-1 text-[10px] font-bold ${
            activeTab === 'activity'
              ? 'text-teal-600 dark:text-teal-400'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <History className="w-5 h-5" />
          <span>Activity</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex flex-col items-center gap-1 p-1 text-[10px] font-bold ${
            activeTab === 'analytics'
              ? 'text-teal-600 dark:text-teal-400'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <PieChart className="w-5 h-5" />
          <span>Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('terms')}
          className={`flex flex-col items-center gap-1 p-1 text-[10px] font-bold ${
            activeTab === 'terms'
              ? 'text-teal-600 dark:text-teal-400'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span>Terms</span>
        </button>
      </nav>

      {/* MODALS */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        groups={groups}
        activeGroupId={currentGroupId}
        users={users}
        defaultCurrency={globalCurrency}
        onSaveExpense={addExpense}
        onCreateGroupRequest={() => setActiveTab('groups')}
      />

      <SettleUpModal
        isOpen={isSettleUpOpen}
        onClose={() => setIsSettleUpOpen(false)}
        users={users}
        currentUserId={currentUser.id}
        defaultPayerId={settleDebtPreset?.fromUserId}
        defaultPayeeId={settleDebtPreset?.toUserId}
        globalCurrency={globalCurrency}
        onConfirmSettlement={recordSettlement}
      />

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentUser={currentUser}
        onSave={updateProfile}
      />
    </div>
  );
}

export default function App() {
  return (
    <EqualPayProvider>
      <EqualPayAppContent />
    </EqualPayProvider>
  );
}
