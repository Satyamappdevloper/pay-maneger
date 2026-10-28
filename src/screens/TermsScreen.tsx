/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Pay Manager: Terms & Conditions and Privacy Policy Screen
 * Professional, clear policies covering guest mode, data privacy,
 * local storage persistence, fair use, and financial liability disclaimer.
 */

import React, { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  Lock,
  Database,
  Scale,
  AlertTriangle,
  Coins,
  CheckCircle2,
  ExternalLink,
  Mail,
  Calendar,
} from 'lucide-react';
import { GoogleAdBanner } from '../components/GoogleAdBanner.tsx';

export const TermsScreen: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('all');

  const lastUpdated = 'October 28, 2026';

  const sections = [
    {
      id: 'nature',
      icon: Scale,
      title: '1. Service Scope & Non-Banking Disclaimer',
      summary: 'Expense tracking and mathematical debt simplification only; not a financial institution or money transmitter.',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            <strong>Pay Manager</strong> is an independent digital utility designed exclusively for tracking shared group expenses, computing peer-to-peer balance splits, and generating graph-minimized debt settlements.
          </p>
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Important Financial Notice</p>
              <p className="mt-0.5">
                Pay Manager is <strong>NOT</strong> a bank, licensed money transmitter, depository institution, or escrow agent. Pay Manager does not hold, transmit, custody, or process fiat currency or payment transactions. All monetary transfers must be settled directly between individuals via their own chosen banking, cash, or payment providers.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'guest',
      icon: Lock,
      title: '2. 100% Guest Mode & Zero-Login Architecture',
      summary: 'No passwords, no mandatory account sign-up walls, and no personal credential collection.',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            Pay Manager operates under a <strong>Direct Guest Mode</strong> design philosophy. Users are granted instant, friction-free access to all core calculation engines, group managers, and activity logs without completing mandatory registration flows, SMS OTP verifications, or password configurations.
          </p>
          <p>
            Your display persona, custom avatar selection, and preferred base currency are customizable directly on your device and are never locked behind a login gate.
          </p>
        </div>
      ),
    },
    {
      id: 'privacy',
      icon: Database,
      title: '3. Data Privacy & Local Storage Usage',
      summary: 'Your group expenses and debt records remain stored securely in your browser.',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            We uphold a strict <strong>Privacy-by-Design</strong> principle:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Client-Side Persistence:</strong> All created groups, expenses, receipt metadata, and settlement history are stored locally in your browser storage (<code className="text-teal-600 dark:text-teal-400 font-mono">localStorage</code> and high-capacity client storage).
            </li>
            <li>
              <strong>No Data Brokerage:</strong> Pay Manager never sells, rents, monetizes, or shares your personal debt records or financial breakdowns with advertising data brokers.
            </li>
            <li>
              <strong>Offline-First Resilience:</strong> All calculations, debt simplifications, and balances function seamlessly even when disconnected from the internet.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'currency',
      icon: Coins,
      title: '4. Multi-Currency Conversion & Estimates',
      summary: 'Foreign exchange rates are provided for convenience calculations and reference only.',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            Currency conversions within Pay Manager are calculated using free, publicly accessible foreign exchange rate endpoints (<code className="text-teal-600 dark:text-teal-400 font-mono">open.er-api.com</code>) with embedded static offline fallbacks.
          </p>
          <p>
            Exchange rates fluctuate continuously. Calculated splits are provided for convenience and estimate budgeting. You should confirm the exact settlement rate with your peers or financial institution prior to executing cross-border wire transfers.
          </p>
        </div>
      ),
    },
    {
      id: 'fairuse',
      icon: ShieldCheck,
      title: '5. Fair Use, Reminders & WhatsApp Links',
      summary: 'Click-to-chat links are generated client-side for friendly group coordination.',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            Pay Manager provides direct client-side WhatsApp Click-to-Chat deep links (<code className="text-teal-600 dark:text-teal-400 font-mono">https://wa.me/?text=...</code>) to facilitate polite settlement reminders with friends and travel companions.
          </p>
          <p>
            You agree not to use Pay Manager communication tools to spam, harass, send unsolicited commercial messages, or intimidate group participants.
          </p>
        </div>
      ),
    },
    {
      id: 'liability',
      icon: Scale,
      title: '6. Limitation of Liability',
      summary: 'Provided on an "as is" and "as available" basis without financial warranties.',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            To the maximum extent permitted by applicable law, Pay Manager and its creators disclaim all warranties, express or implied, regarding the mathematical accuracy, server uptime, or financial consequences resulting from reliance on the application.
          </p>
          <p>
            Users assume sole responsibility for reviewing calculations and confirming financial agreements with their co-participants.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/20 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Terms & Conditions
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">
                  Legal & Privacy
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>Last reviewed: {lastUpdated}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border border-teal-500/20">
              <ShieldCheck className="w-4 h-4" /> 100% Guest Friendly
            </span>
          </div>
        </div>
      </div>

      {/* Policy Sections Grid */}
      <div className="space-y-4">
        {sections.map((section) => {
          const IconComponent = section.icon;
          return (
            <div
              key={section.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-teal-500/40 transition-colors"
            >
              <div className="flex items-start gap-3.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                  <IconComponent className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {section.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {section.summary}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                {section.content}
              </div>
            </div>
          );
        })}
      </div>

      {/* Support & Contact Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold">Questions regarding our policies?</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Contact our product team or submit feedback anytime.
            </p>
          </div>
        </div>

        <a
          href="mailto:satyamthumbnaidesigner@gmail.com?subject=Pay%20Manager%20Policy%20Inquiry"
          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition-colors shadow-sm shrink-0"
        >
          Contact Support
        </a>
      </div>

      {/* Google Ads Placement */}
      <GoogleAdBanner />
    </div>
  );
};
