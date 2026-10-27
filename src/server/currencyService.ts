/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Free Public Multi-Currency Conversion Service
 * Uses https://open.er-api.com/v6/latest/{BASE} - 100% Free, NO API Key or Secret Required.
 * Falls back seamlessly to institutional offline rates when disconnected.
 */

import { OFFLINE_FALLBACK_RATES } from '../engines/currency.ts';

export interface CurrencyRatesCache {
  base: string;
  timestamp: number;
  rates: Record<string, number>;
  source: 'FreePublicAPI' | 'InstitutionalFallback';
}

class CurrencyConversionService {
  private cache: Map<string, CurrencyRatesCache> = new Map();
  private isWorkerRunning = false;
  private updateIntervalMs = 1000 * 60 * 60; // 1 hour

  constructor() {
    this.seedDefaultRates();
    this.startBackgroundWorker();
  }

  private seedDefaultRates() {
    this.cache.set('USD', {
      base: 'USD',
      timestamp: Date.now(),
      rates: { ...OFFLINE_FALLBACK_RATES },
      source: 'InstitutionalFallback',
    });
  }

  /**
   * Fetches latest exchange rates from the 100% free open endpoint:
   * https://open.er-api.com/v6/latest/{BASE}
   * No API key, registration, or credit card required!
   */
  async fetchLiveRates(baseCurrency = 'USD'): Promise<CurrencyRatesCache> {
    const normalizedBase = baseCurrency.toUpperCase();
    const cached = this.cache.get(normalizedBase);

    // Serve fresh cache (< 30 minutes old) to minimize redundant outbound network calls
    if (cached && Date.now() - cached.timestamp < 1000 * 60 * 30) {
      return cached;
    }

    let liveRates: Record<string, number> | null = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);

      // Open public API provided by ExchangeRate-API (er-api.com) with no authentication required
      const url = `https://open.er-api.com/v6/latest/${normalizedBase}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data && data.rates) {
          liveRates = data.rates;
        }
      }
    } catch (e) {
      console.warn(`[CurrencyService] Free public API network fetch skipped or offline. Using fallback cache.`);
    }

    if (liveRates) {
      const entry: CurrencyRatesCache = {
        base: normalizedBase,
        timestamp: Date.now(),
        rates: liveRates,
        source: 'FreePublicAPI',
      };
      this.cache.set(normalizedBase, entry);
      return entry;
    }

    // Normalize static OFFLINE_FALLBACK_RATES to requested base currency
    const baseToUsdRate = OFFLINE_FALLBACK_RATES[normalizedBase] || 1.0;
    const normalizedFallback: Record<string, number> = {};

    for (const [curr, usdRate] of Object.entries(OFFLINE_FALLBACK_RATES)) {
      normalizedFallback[curr] = +(usdRate / baseToUsdRate).toFixed(6);
    }

    const fallbackEntry: CurrencyRatesCache = {
      base: normalizedBase,
      timestamp: Date.now(),
      rates: normalizedFallback,
      source: 'InstitutionalFallback',
    };
    this.cache.set(normalizedBase, fallbackEntry);
    return fallbackEntry;
  }

  private startBackgroundWorker() {
    if (this.isWorkerRunning) return;
    this.isWorkerRunning = true;

    // Periodic rate refresh every hour
    setInterval(async () => {
      try {
        await this.fetchLiveRates('USD');
      } catch (err) {
        // Silent catch for headless offline runtime
      }
    }, this.updateIntervalMs);
  }

  getRatesSync(base = 'USD'): Record<string, number> {
    const cached = this.cache.get(base.toUpperCase());
    return cached ? cached.rates : OFFLINE_FALLBACK_RATES;
  }
}

export const currencyService = new CurrencyConversionService();
