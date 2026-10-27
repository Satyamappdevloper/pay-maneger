/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Offline-First Sync Queue Inspector & Storage Studio
 * Technical Specification 2.C
 */

import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Database,
  RefreshCw,
  HardDrive,
  Smartphone,
  CheckCircle,
  AlertOctagon,
  Clock,
  Send,
  Trash2,
  Layers,
} from 'lucide-react';
import { SyncQueueItem } from '../models/types.ts';
import { syncQueueInstance } from '../storage/offlineSyncQueue.ts';

export const OfflineSyncInspector: React.FC = () => {
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(syncQueueInstance.isOnline());
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(!syncQueueInstance.isOnline());
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activePlatform, setActivePlatform] = useState<'web' | 'android'>('web');
  const [syncLogs, setSyncLogs] = useState<string[]>([
    'OfflineSyncQueueManager initialized with IndexedDB/LocalStorage hybrid.',
    'Background network event listeners registered for online/offline triggers.',
  ]);

  useEffect(() => {
    const unsubQueue = syncQueueInstance.subscribeQueue((items) => {
      setQueue(items);
    });
    const unsubNetwork = syncQueueInstance.subscribeNetwork((online) => {
      setIsOnline(online);
    });

    return () => {
      unsubQueue();
      unsubNetwork();
    };
  }, []);

  const addLog = (msg: string) => {
    setSyncLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 19),
    ]);
  };

  const handleToggleOffline = () => {
    const nextState = !simulatedOffline;
    setSimulatedOffline(nextState);
    syncQueueInstance.setSimulatedNetworkStatus(nextState ? false : true);
    addLog(
      nextState
        ? '📴 Simulated Network Offline (Mutations will queue locally in storage)'
        : '📶 Network Online Restored (Triggering auto-sync replay...)'
    );
  };

  const handleSimulateOfflineExpense = async () => {
    const randomAmount = Math.floor(Math.random() * 80) + 15;
    const randomTitle = ['Subway Commute', 'Coffee & Croissant', 'Airport Parking', 'Grocery Refill'][
      Math.floor(Math.random() * 4)
    ];

    addLog(`Creating offline transaction: "${randomTitle}" ($${randomAmount}) on ${activePlatform}`);
    await syncQueueInstance.enqueue(
      'CREATE_EXPENSE',
      'expense',
      `exp_mock_${Date.now()}`,
      {
        title: randomTitle,
        amount: randomAmount,
        currency: 'USD',
        date: new Date().toISOString(),
      },
      activePlatform
    );
  };

  const handleFlushQueue = async () => {
    if (!isOnline) {
      addLog('Cannot sync while offline! Toggle network to online first.');
      return;
    }

    setIsProcessing(true);
    addLog('Starting batch sync queue processing with retry backoff...');
    const result = await syncQueueInstance.processQueue();
    setIsProcessing(false);
    addLog(
      `Sync round finished: ${result.processed} processed, ${result.succeeded} succeeded, ${result.failed} failed.`
    );
  };

  const handleClearQueue = async () => {
    await syncQueueInstance.clearQueue();
    addLog('Cleared all items from sync storage.');
  };

  const pendingItems = queue.filter((i) => i.status === 'PENDING');
  const syncingItems = queue.filter((i) => i.status === 'SYNCING');
  const failedItems = queue.filter((i) => i.status === 'FAILED');

  return (
    <div className="space-y-6">
      {/* Top Banner with Platform & Network Switchers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Network Status Toggle */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Network Simulator
            </div>
            <div className="text-lg font-bold text-white mt-1 flex items-center gap-2">
              {isOnline ? (
                <>
                  <Wifi className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400">Online & Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-400">Offline / Subterranean</span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={handleToggleOffline}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-sm ${
              simulatedOffline
                ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
            }`}
          >
            {simulatedOffline ? 'Go Online' : 'Simulate Airplane Mode'}
          </button>
        </div>

        {/* Platform Origin Switcher */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Cross-Platform Bridge
            </div>
            <div className="text-lg font-bold text-white mt-1 flex items-center gap-2">
              {activePlatform === 'web' ? (
                <>
                  <HardDrive className="w-5 h-5 text-indigo-400" />
                  <span>Web App (IndexedDB)</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  <span>Android SQLite Bridge</span>
                </>
              )}
            </div>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActivePlatform('web')}
              className={`px-2.5 py-1 rounded font-medium ${
                activePlatform === 'web'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Web
            </button>
            <button
              onClick={() => setActivePlatform('android')}
              className={`px-2.5 py-1 rounded font-medium ${
                activePlatform === 'android'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Android
            </button>
          </div>
        </div>

        {/* Storage Engine Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Storage Driver
            </div>
            <div className="text-lg font-bold text-white mt-1 flex items-center gap-2">
              <Database className="w-5 h-5 text-cyan-400" />
              <span>{syncQueueInstance.getStorageName()}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {queue.length} Queue Items
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Queue Table & Action Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Queue Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Persistent Sync Queue ({queue.length})
              </h3>
              <p className="text-xs text-slate-400">
                Queued mutations with client idempotency IDs and Last-Write-Wins timestamps
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSimulateOfflineExpense}
                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Enqueue Offline Action
              </button>
              <button
                onClick={handleFlushQueue}
                disabled={isProcessing || !isOnline}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                Sync Now
              </button>
            </div>
          </div>

          {/* Queue List */}
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {queue.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">All Changes In Sync!</p>
                <p className="text-xs text-slate-500">
                  Click &ldquo;Enqueue Offline Action&rdquo; to test offline queuing.
                </p>
              </div>
            ) : (
              queue.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-500">{item.id}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold text-[10px]">
                        {item.operation}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({item.deviceOrigin.toUpperCase()})
                      </span>
                    </div>

                    <div className="text-slate-300 font-medium">
                      Entity: <span className="font-mono text-emerald-400">{item.entityId}</span>
                      {' • '}
                      Payload: <span className="text-slate-400">{JSON.stringify(item.payload)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'PENDING'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : item.status === 'SYNCING'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30 animate-pulse'
                          : item.status === 'SYNCED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 flex justify-between items-center text-xs text-slate-500">
            <span>
              Pending: {pendingItems.length} | Syncing: {syncingItems.length} | Failed: {failedItems.length}
            </span>
            {queue.length > 0 && (
              <button
                onClick={handleClearQueue}
                className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px]"
              >
                <Trash2 className="w-3 h-3" /> Clear Queue
              </button>
            )}
          </div>
        </div>

        {/* Right 1 Col: Sync Event Log & Architecture Specs */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Sync Architecture & Event Stream</h3>
            <p className="text-xs text-slate-400 mb-3">
              Real-time events from the OfflineSyncQueueManager
            </p>

            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1.5 max-h-72 overflow-y-auto">
              {syncLogs.map((log, idx) => (
                <div key={idx} className="leading-tight">
                  {log}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 space-y-2 text-xs">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-emerald-400" />
              Conflict Resolution: Last-Write-Wins
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When a user edits an expense on their Android phone while disconnected from cell service and another
              user edits on Web, EqualPay timestamps each mutation at the nanosecond layer and applies deterministic
              LWW merge with full transaction reversibility.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
