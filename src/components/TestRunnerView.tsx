/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Automated Unit Test Suite Runner
 * Technical Specification 3: Verifies multi-person debt simplification & calculation engines
 */

import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, XCircle, Clock, Check, Terminal, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { runAllTests, TestCaseResult } from '../tests/debtSimplifier.test.ts';

export const TestRunnerView: React.FC = () => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [testReport, setTestReport] = useState<{
    total: number;
    passed: number;
    failed: number;
    durationMs: number;
    results: TestCaseResult[];
  } | null>(null);
  const [expandedTest, setExpandedTest] = useState<number | null>(null);

  const executeTests = async () => {
    setIsRunning(true);
    // Yield to let UI show spinner
    await new Promise((r) => setTimeout(r, 60));
    try {
      const report = await runAllTests();
      setTestReport(report);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    // Run tests once on mount automatically
    executeTests();
  }, []);

  const toggleExpand = (idx: number) => {
    setExpandedTest(expandedTest === idx ? null : idx);
  };

  return (
    <div className="space-y-6">
      {/* Test Suite Summary Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              Engine Verification & Mathematical Test Suite
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated integration and edge-case unit tests for Graph Debt Simplification, Currency, Splits & Sync
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={executeTests}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-md"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? 'Running Engine Tests...' : 'Re-Run All Verification Tests'}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        {testReport && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Test Cases</span>
              <div className="text-2xl font-bold text-white mt-1">{testReport.total} Scenarios</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase">Passed</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5" />
                {testReport.passed}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[11px] font-semibold text-rose-400 uppercase">Failed</span>
              <div className="text-2xl font-bold text-rose-400 mt-1 flex items-center gap-1.5">
                {testReport.failed === 0 ? (
                  <span className="text-slate-500 text-base font-medium">0 (All Green)</span>
                ) : (
                  <>
                    <XCircle className="w-5 h-5" />
                    {testReport.failed}
                  </>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Execution Time</span>
              <div className="text-2xl font-bold text-cyan-400 mt-1 flex items-center gap-1 font-mono">
                <Clock className="w-4 h-4" />
                {testReport.durationMs}ms
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test Cases List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white mb-2">Scenario Executions & Assertion Details</h3>

        <div className="space-y-2.5">
          {testReport?.results.map((test, idx) => {
            const isExpanded = expandedTest === idx;

            return (
              <div
                key={idx}
                className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden transition-all"
              >
                <div
                  onClick={() => toggleExpand(idx)}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-900/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {test.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{test.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                          {test.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{test.details}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500">{test.durationMs}ms</span>
                    <button className="text-slate-400 hover:text-white">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && Boolean(test.dataSnapshot) ? (
                  <div className="p-3.5 bg-slate-900/90 border-t border-slate-800 text-xs font-mono">
                    <div className="text-[11px] text-slate-400 font-semibold mb-1">
                      Detailed State & Balance Output Snapshot:
                    </div>
                    <pre className="p-3 bg-slate-950 rounded-lg text-emerald-400 overflow-x-auto text-[11px]">
                      {JSON.stringify(test.dataSnapshot, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
