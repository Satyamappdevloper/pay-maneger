/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Multi-Currency Conversion Engine
 * Technical Specification 2.A
 */

import { CurrencyMetadata } from '../models/types.ts';

/**
 * Standard offline fallback exchange rates pegged to USD (1.0 USD = X units of currency).
 * Updated with current realistic institutional benchmark rates.
 */
export const OFFLINE_FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 152.5,
  CAD: 1.38,
  AUD: 1.52,
  INR: 84.1,
  CHF: 0.88,
  SGD: 1.32,
  NZD: 1.66,
  CNY: 7.24,
  HKD: 7.82,
  MXN: 19.85,
  BRL: 5.65,
  SEK: 10.45,
  NOK: 10.88,
  AED: 3.67,
  THB: 34.2,
};

export const SUPPORTED_CURRENCIES: Record<string, CurrencyMetadata> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2, flag: '🇺🇸' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, flag: '🇪🇺' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2, flag: '🇬🇧' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0, flag: '🇯🇵' },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', decimals: 2, flag: '🇨🇦' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2, flag: '🇦🇺' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2, flag: '🇮🇳' },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', decimals: 2, flag: '🇨🇭' },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2, flag: '🇸🇬' },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht', decimals: 2, flag: '🇹🇭' },
  MXN: { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', decimals: 2, flag: '🇲🇽' },
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', decimals: 2, flag: '🇦🇪' },
};

/**
 * Converts an amount from one currency to another using the provided exchange rate dictionary.
 * If a currency is missing in exchangeRates or rates are empty/invalid,
 * it safely falls back to OFFLINE_FALLBACK_RATES.
 * 
 * Rates are assumed to be referenced to a common base (e.g. 1 USD = rate units).
 * Formula: crossAmount = (amount / fromRate) * toRate
 * 
 * @param amount The numerical amount in fromCurrency
 * @param fromCurrency Source ISO-4217 currency code
 * @param toCurrency Destination ISO-4217 currency code
 * @param exchangeRates Optional dictionary of currency rates against USD
 * @returns Converted amount rounded to currency precision
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRates: Record<string, number> = OFFLINE_FALLBACK_RATES
): number {
  if (isNaN(amount)) return 0;
  if (amount === 0) return 0;

  const normalizedFrom = fromCurrency?.toUpperCase().trim() || 'USD';
  const normalizedTo = toCurrency?.toUpperCase().trim() || 'USD';

  if (normalizedFrom === normalizedTo) {
    return roundCurrency(amount, normalizedTo);
  }

  // Resolve rates with offline fallback protection
  const fromRate = exchangeRates[normalizedFrom] ?? OFFLINE_FALLBACK_RATES[normalizedFrom];
  const toRate = exchangeRates[normalizedTo] ?? OFFLINE_FALLBACK_RATES[normalizedTo];

  if (!fromRate || !toRate || fromRate <= 0 || toRate <= 0) {
    console.warn(
      `[CurrencyEngine] Missing rate for ${normalizedFrom} -> ${normalizedTo}. Using 1:1 parity fallback.`
    );
    return roundCurrency(amount, normalizedTo);
  }

  // Base currency triangular arbitrage cross-rate
  // amount in USD = amount / fromRate
  // amount in toCurrency = (amount / fromRate) * toRate
  const converted = (amount / fromRate) * toRate;
  return roundCurrency(converted, normalizedTo);
}

/**
 * Rounds a monetary amount based on the target currency's standard decimal specification.
 * e.g., JPY has 0 decimals; USD/EUR have 2 decimals.
 */
export function roundCurrency(amount: number, currencyCode: string = 'USD'): number {
  const meta = SUPPORTED_CURRENCIES[currencyCode.toUpperCase()];
  const decimals = meta ? meta.decimals : 2;
  const factor = Math.pow(10, decimals);
  // Avoid floating point precision issues like 0.1 + 0.2 = 0.30000000000000004
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

/**
 * Formats a monetary value with proper currency symbol, grouping, and decimal places.
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'USD',
  showSymbol: boolean = true
): string {
  const meta = SUPPORTED_CURRENCIES[currencyCode.toUpperCase()];
  const decimals = meta ? meta.decimals : 2;
  const symbol = meta ? meta.symbol : currencyCode;

  const formattedNum = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(amount));

  const sign = amount < 0 ? '-' : '';

  if (!showSymbol) {
    return `${sign}${formattedNum} ${currencyCode.toUpperCase()}`;
  }

  return `${sign}${symbol}${formattedNum}`;
}

/**
 * Helper to get the exchange rate from one currency to another directly.
 */
export function getExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  exchangeRates: Record<string, number> = OFFLINE_FALLBACK_RATES
): number {
  return convertCurrency(1, fromCurrency, toCurrency, exchangeRates);
}
