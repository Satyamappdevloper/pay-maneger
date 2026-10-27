/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Test Suite for Graph Debt Simplification & Currency Engines
 * Technical Specification 3: Unit tests verifying complex multi-person scenarios.
 */

import { Expense, Debt } from '../models/types.ts';
import { calculateNetBalances, simplifyDebts, analyzeDebtSimplification, calculateRawDebts } from '../engines/debtSimplifier.ts';
import { convertCurrency, roundCurrency, OFFLINE_FALLBACK_RATES } from '../engines/currency.ts';
import { calculateSplits } from '../engines/splitCalculator.ts';
import { OfflineSyncQueueManager } from '../storage/offlineSyncQueue.ts';
import { MemoryStorageAdapter } from '../storage/storageAdapter.ts';

export interface TestCaseResult {
  name: string;
  category: 'Debt Simplification' | 'Multi-Currency' | 'Split Calculations' | 'Offline Sync';
  passed: boolean;
  durationMs: number;
  details: string;
  dataSnapshot?: unknown;
}

export async function runAllTests(): Promise<{
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: TestCaseResult[];
}> {
  const results: TestCaseResult[] = [];
  const startTime = performance.now();

  // -------------------------------------------------------------------------
  // Test 1: 3-Person Circular Debt Cycle
  // -------------------------------------------------------------------------
  {
    const t0 = performance.now();
    const members = ['user_alice', 'user_bob', 'user_charlie'];
    const expenses: Expense[] = [
      {
        id: 'exp_1',
        groupId: 'grp_1',
        title: 'Alice pays breakfast',
        totalAmount: 30,
        currency: 'USD',
        paidByUserId: 'user_alice',
        splitType: 'EQUAL',
        splits: [
          { userId: 'user_bob', amount: 15 },
          { userId: 'user_charlie', amount: 15 },
        ],
        date: '2026-10-22T08:00:00Z',
        category: 'Food',
      },
      {
        id: 'exp_2',
        groupId: 'grp_1',
        title: 'Bob pays lunch',
        totalAmount: 30,
        currency: 'USD',
        paidByUserId: 'user_bob',
        splitType: 'EQUAL',
        splits: [
          { userId: 'user_charlie', amount: 15 },
          { userId: 'user_alice', amount: 15 },
        ],
        date: '2026-10-22T13:00:00Z',
        category: 'Food',
      },
      {
        id: 'exp_3',
        groupId: 'grp_1',
        title: 'Charlie pays dinner',
        totalAmount: 30,
        currency: 'USD',
        paidByUserId: 'user_charlie',
        splitType: 'EQUAL',
        splits: [
          { userId: 'user_alice', amount: 15 },
          { userId: 'user_bob', amount: 15 },
        ],
        date: '2026-10-22T19:00:00Z',
        category: 'Food',
      },
    ];

    const netBalances = calculateNetBalances(expenses, members, 'USD');
    const simplified = simplifyDebts(expenses, members, 'USD');
    const raw = calculateRawDebts(expenses, 'USD');

    // Each paid 30, each consumed 30 -> all net balances must be 0
    const allZeroBalances = members.every((m) => Math.abs(netBalances[m]) < 0.01);
    const zeroDebts = simplified.length === 0;
    const hadRawDebts = raw.length > 0;

    const passed = allZeroBalances && zeroDebts && hadRawDebts;
    results.push({
      name: 'Circular Debt Cycle (3 People) -> Reduced to 0 Transactions',
      category: 'Debt Simplification',
      passed,
      durationMs: +(performance.now() - t0).toFixed(2),
      details: passed
        ? `Successfully eliminated ${raw.length} circular transactions down to 0 settlements. Net balances: ${JSON.stringify(netBalances)}`
        : `Failed circular resolution: simplified debts length is ${simplified.length}`,
      dataSnapshot: { netBalances, simplified, rawCount: raw.length },
    });
  }

  // -------------------------------------------------------------------------
  // Test 2: 5-Person Road Trip with Multi-Expense Asymmetric Splits
  // -------------------------------------------------------------------------
  {
    const t0 = performance.now();
    const members = ['alice', 'bob', 'charlie', 'david', 'emma'];
    const expenses: Expense[] = [
      // Alice pays $500 for hotel ($100 each for all 5)
      {
        id: 'exp_hotel',
        groupId: 'roadtrip',
        title: 'Mountain Villa Hotel',
        totalAmount: 500,
        currency: 'USD',
        paidByUserId: 'alice',
        splitType: 'EQUAL',
        splits: members.map((m) => ({ userId: m, amount: 100 })),
        date: '2026-10-20T10:00:00Z',
        category: 'Hotel',
      },
      // Bob pays $150 for Groceries ($30 each for all 5)
      {
        id: 'exp_groceries',
        groupId: 'roadtrip',
        title: 'Costco Wholesale Groceries',
        totalAmount: 150,
        currency: 'USD',
        paidByUserId: 'bob',
        splitType: 'EQUAL',
        splits: members.map((m) => ({ userId: m, amount: 30 })),
        date: '2026-10-20T14:00:00Z',
        category: 'Groceries',
      },
      // Charlie pays $90 for Fuel (Alice, Bob, Charlie only: $30 each)
      {
        id: 'exp_gas',
        groupId: 'roadtrip',
        title: 'Highway Fuel Station',
        totalAmount: 90,
        currency: 'USD',
        paidByUserId: 'charlie',
        splitType: 'EQUAL',
        splits: [
          { userId: 'alice', amount: 30 },
          { userId: 'bob', amount: 30 },
          { userId: 'charlie', amount: 30 },
        ],
        date: '2026-10-21T09:00:00Z',
        category: 'Gas',
      },
      // David pays $60 for Snacks (David and Emma only: $30 each)
      {
        id: 'exp_snacks',
        groupId: 'roadtrip',
        title: 'Roadside Snacks',
        totalAmount: 60,
        currency: 'USD',
        paidByUserId: 'david',
        splitType: 'EQUAL',
        splits: [
          { userId: 'david', amount: 30 },
          { userId: 'emma', amount: 30 },
        ],
        date: '2026-10-21T16:00:00Z',
        category: 'Food',
      },
    ];

    const analysis = analyzeDebtSimplification(expenses, members, 'USD');
    const netSum = Object.values(analysis.netBalances).reduce((acc, v) => acc + v, 0);
    const sumIsZero = Math.abs(netSum) < 0.01;
    // For 5 people, max theoretical transactions in simplified graph is N-1 = 4
    const maxTransactionsValid = analysis.simplifiedDebts.length <= 4;
    // Check conservation of money: sum of debtor payouts equals sum of creditor receipts
    const totalSimplifiedPaid = analysis.simplifiedDebts.reduce((s, d) => s + d.amount, 0);
    const totalPositiveBalance = Object.values(analysis.netBalances)
      .filter((b) => b > 0)
      .reduce((s, b) => s + b, 0);
    const balancesConserved = Math.abs(totalSimplifiedPaid - totalPositiveBalance) < 0.02;

    const passed = sumIsZero && maxTransactionsValid && balancesConserved;
    results.push({
      name: '5-Person Road Trip (Complex Asymmetric Splits & Net Conservation)',
      category: 'Debt Simplification',
      passed,
      durationMs: +(performance.now() - t0).toFixed(2),
      details: passed
        ? `Cut from ${analysis.metrics.rawTransactionCount} raw debts to ${analysis.metrics.simplifiedTransactionCount} simplified transfers (${analysis.metrics.reductionPercentage}% reduction). Zero-sum verified: ${netSum.toFixed(4)}`
        : `Validation failed: sumIsZero=${sumIsZero}, maxTransValid=${maxTransactionsValid}, balancesConserved=${balancesConserved}`,
      dataSnapshot: analysis,
    });
  }

  // -------------------------------------------------------------------------
  // Test 3: Multi-Currency Conversion (USD, EUR, JPY) with Base Settlement
  // -------------------------------------------------------------------------
  {
    const t0 = performance.now();
    const members = ['alice', 'kenji', 'marco'];
    // 1 USD = 152.5 JPY, 1 USD = 0.92 EUR
    const rates = OFFLINE_FALLBACK_RATES;

    const expenses: Expense[] = [
      // Kenji pays ¥30,500 JPY in Tokyo for Alice, Kenji, Marco
      // 30,500 JPY / 152.5 = 200 USD (66.67 USD each)
      {
        id: 'exp_tokyo',
        groupId: 'worldtrip',
        title: 'Shinjuku Izakaya Dinner',
        totalAmount: 30500,
        currency: 'JPY',
        paidByUserId: 'kenji',
        splitType: 'EQUAL',
        splits: [
          { userId: 'alice', amount: 10167 },
          { userId: 'kenji', amount: 10167 },
          { userId: 'marco', amount: 10166 },
        ],
        date: '2026-10-15T19:00:00Z',
        category: 'Food',
      },
      // Marco pays €184 EUR in Rome for Alice, Kenji, Marco
      // 184 EUR / 0.92 = 200 USD (66.67 USD each)
      {
        id: 'exp_rome',
        groupId: 'worldtrip',
        title: 'Colosseum Guided Tour',
        totalAmount: 184,
        currency: 'EUR',
        paidByUserId: 'marco',
        splitType: 'EQUAL',
        splits: [
          { userId: 'alice', amount: 61.34 },
          { userId: 'kenji', amount: 61.33 },
          { userId: 'marco', amount: 61.33 },
        ],
        date: '2026-10-17T11:00:00Z',
        category: 'Tour',
      },
    ];

    const simplified = simplifyDebts(expenses, members, 'USD', rates);
    const netBalances = calculateNetBalances(expenses, members, 'USD', rates);

    // Alice paid nothing and owed ~133.34 USD
    // Kenji paid $200 and owed $133.33 -> net +$66.67
    // Marco paid $200 and owed $133.33 -> net +$66.67
    // Total simplified debts should have Alice paying Kenji ~$66.67 and Marco ~$66.67
    const aliceBalance = netBalances['alice'];
    const aliceOwesTotal = aliceBalance < -130 && aliceBalance > -135;
    const simplifiedHas2Debts = simplified.length === 2;
    const allDebtsFromAlice = simplified.every((d) => d.fromUserId === 'alice');

    const passed = aliceOwesTotal && simplifiedHas2Debts && allDebtsFromAlice;
    results.push({
      name: 'Multi-Currency Conversion (JPY & EUR to USD Base Settlement)',
      category: 'Multi-Currency',
      passed,
      durationMs: +(performance.now() - t0).toFixed(2),
      details: passed
        ? `Accurately converted JPY (152.5) & EUR (0.92) to USD. Alice owes Kenji $${simplified[0]?.amount} and Marco $${simplified[1]?.amount}`
        : `Multi-currency failed: Alice balance = ${aliceBalance}, simplified length = ${simplified.length}`,
      dataSnapshot: { netBalances, simplified },
    });
  }

  // -------------------------------------------------------------------------
  // Test 4: Split Calculator Penny Reconciliation (Equal, Percent, Shares)
  // -------------------------------------------------------------------------
  {
    const t0 = performance.now();
    // 100 / 3 must produce [33.34, 33.33, 33.33] which sums exactly to 100.00
    const equalResult = calculateSplits({
      totalAmount: 100,
      splitType: 'EQUAL',
      currency: 'USD',
      memberIds: ['m1', 'm2', 'm3'],
    });

    const equalSum = equalResult.splits.reduce((acc, s) => acc + s.amount, 0);
    const equalPassed = equalResult.isValid && Math.abs(equalSum - 100) < 0.001;

    // Shares split: 1 share, 2 shares, 3 shares for $60
    const sharesResult = calculateSplits({
      totalAmount: 60,
      splitType: 'SHARES',
      currency: 'USD',
      memberIds: ['m1', 'm2', 'm3'],
      customValues: { m1: 1, m2: 2, m3: 3 }, // 10, 20, 30
    });
    const sharesSum = sharesResult.splits.reduce((acc, s) => acc + s.amount, 0);
    const sharesPassed =
      sharesResult.isValid &&
      sharesResult.splits[0].amount === 10 &&
      sharesResult.splits[1].amount === 20 &&
      sharesResult.splits[2].amount === 30 &&
      Math.abs(sharesSum - 60) < 0.001;

    // Percentage split: 50%, 25%, 25% for $80.50
    const pctResult = calculateSplits({
      totalAmount: 80.5,
      splitType: 'PERCENTAGE',
      currency: 'USD',
      memberIds: ['m1', 'm2', 'm3'],
      customValues: { m1: 50, m2: 25, m3: 25 },
    });
    const pctSum = pctResult.splits.reduce((acc, s) => acc + s.amount, 0);
    const pctPassed = pctResult.isValid && Math.abs(pctSum - 80.5) < 0.001;

    const passed = equalPassed && sharesPassed && pctPassed;
    results.push({
      name: 'Penny-Perfect Split Calculations (Equal, Shares, Percentage Reconciliation)',
      category: 'Split Calculations',
      passed,
      durationMs: +(performance.now() - t0).toFixed(2),
      details: passed
        ? `Equal (sum=${equalSum}), Shares (10/20/30, sum=${sharesSum}), Percentage (sum=${pctSum}). All zero remainder!`
        : `Split calculations failed: equal=${equalPassed}, shares=${sharesPassed}, pct=${pctPassed}`,
      dataSnapshot: { equalResult, sharesResult, pctResult },
    });
  }

  // -------------------------------------------------------------------------
  // Test 5: Disjoint Subgraphs (Independent Settlements)
  // -------------------------------------------------------------------------
  {
    const t0 = performance.now();
    // Subgraph 1: A, B; Subgraph 2: C, D
    const members = ['userA', 'userB', 'userC', 'userD'];
    const expenses: Expense[] = [
      {
        id: 'exp_ab',
        groupId: 'disjoint',
        title: 'A pays for B',
        totalAmount: 50,
        currency: 'USD',
        paidByUserId: 'userA',
        splitType: 'EQUAL',
        splits: [
          { userId: 'userA', amount: 25 },
          { userId: 'userB', amount: 25 },
        ],
        date: '2026-10-22T10:00:00Z',
        category: 'Other',
      },
      {
        id: 'exp_cd',
        groupId: 'disjoint',
        title: 'C pays for D',
        totalAmount: 80,
        currency: 'USD',
        paidByUserId: 'userC',
        splitType: 'EQUAL',
        splits: [
          { userId: 'userC', amount: 40 },
          { userId: 'userD', amount: 40 },
        ],
        date: '2026-10-22T10:00:00Z',
        category: 'Other',
      },
    ];

    const simplified = simplifyDebts(expenses, members, 'USD');
    // userB must owe userA $25; userD must owe userC $40
    const bOwesA = simplified.find((d) => d.fromUserId === 'userB' && d.toUserId === 'userA' && d.amount === 25);
    const dOwesC = simplified.find((d) => d.fromUserId === 'userD' && d.toUserId === 'userC' && d.amount === 40);
    const passed = simplified.length === 2 && Boolean(bOwesA) && Boolean(dOwesC);

    results.push({
      name: 'Disconnected Subgraphs Settlement Isolation',
      category: 'Debt Simplification',
      passed,
      durationMs: +(performance.now() - t0).toFixed(2),
      details: passed
        ? `Correctly isolated payments between Subgraph 1 (B->A $25) and Subgraph 2 (D->C $40) with no cross-bleeding.`
        : `Disjoint test failed: simplified length is ${simplified.length}`,
      dataSnapshot: { simplified },
    });
  }

  // -------------------------------------------------------------------------
  // Test 6: Offline Storage & Background Sync Queue Lifecycle
  // -------------------------------------------------------------------------
  {
    const t0 = performance.now();
    const memStorage = new MemoryStorageAdapter();
    const syncManager = new OfflineSyncQueueManager(memStorage);
    await syncManager.init();

    // Simulate going offline
    syncManager.setSimulatedNetworkStatus(false);

    // Enqueue 2 operations while offline
    const item1 = await syncManager.enqueue('CREATE_EXPENSE', 'expense', 'exp_off_1', { title: 'Offline Taxi', amount: 25 });
    const item2 = await syncManager.enqueue('UPDATE_EXPENSE', 'expense', 'exp_off_2', { title: 'Updated Lunch', amount: 45 });

    const pendingOffline = syncManager.getPendingCount();
    const wasPending = pendingOffline === 2 && item1.status === 'PENDING' && item2.status === 'PENDING';

    // Bring online and process queue
    syncManager.setSimulatedNetworkStatus(true);
    const syncResult = await syncManager.processQueue(async (item) => {
      // Mock cloud receipt
      return true;
    });

    const passed = wasPending && syncResult.succeeded === 2;
    results.push({
      name: 'Offline-First Queue: Enqueue Offline -> Reconnect -> Batch Sync Replay',
      category: 'Offline Sync',
      passed,
      durationMs: +(performance.now() - t0).toFixed(2),
      details: passed
        ? `Successfully queued 2 mutations offline, persisted in storage, and replayed on reconnection (2 synced, 0 failed).`
        : `Offline queue failed: wasPending=${wasPending}, succeeded=${syncResult.succeeded}`,
      dataSnapshot: { syncResult, pendingOffline },
    });
  }

  const durationMs = +(performance.now() - startTime).toFixed(2);
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    durationMs,
    results,
  };
}
