/**
 * Multi-Currency & Taiwan (TWD) <-> India (INR) Cross-Border Exchange Engine.
 */

export interface CurrencyConfig {
  code: string
  name: string
  symbol: string
  flag: string
  locale: string
  decimals: number
  minorUnitName: string
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  TWD: {
    code: 'TWD',
    name: 'New Taiwan Dollar',
    symbol: 'NT$',
    flag: '🇹🇼',
    locale: 'zh-TW',
    decimals: 0, // In practice, TWD does not use cents/minor decimals
    minorUnitName: 'cents (internal: 100 minor = 1 NT$)',
  },
  INR: {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    flag: '🇮🇳',
    locale: 'en-IN',
    decimals: 2,
    minorUnitName: 'paise',
  },
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    flag: '🇺🇸',
    locale: 'en-US',
    decimals: 2,
    minorUnitName: 'cents',
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    flag: '🇪🇺',
    locale: 'de-DE',
    decimals: 2,
    minorUnitName: 'cents',
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    flag: '🇬🇧',
    locale: 'en-GB',
    decimals: 2,
    minorUnitName: 'pence',
  },
}

// Default base exchange rates against 1 USD
export const DEFAULT_USD_RATES: Record<string, number> = {
  USD: 1.0,
  TWD: 32.50, // 1 USD = 32.50 TWD
  INR: 86.20, // 1 USD = 86.20 INR => 1 TWD = (86.20 / 32.50) ≈ 2.652 INR
  EUR: 0.92,
  GBP: 0.79,
}

const RATES_STORAGE_KEY = 'spendwise_currency_rates_v1'

export function getExchangeRates(): Record<string, number> {
  try {
    const saved = localStorage.getItem(RATES_STORAGE_KEY)
    if (saved) {
      return { ...DEFAULT_USD_RATES, ...JSON.parse(saved) }
    }
  } catch (err) {
    console.error('Failed to parse exchange rates from storage', err)
  }
  return { ...DEFAULT_USD_RATES }
}

export function saveExchangeRates(rates: Record<string, number>): void {
  try {
    localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(rates))
  } catch (err) {
    console.error('Failed to save exchange rates', err)
  }
}

/**
 * Get direct exchange rate from baseCurrency to targetCurrency.
 * E.g., getRate('TWD', 'INR') returns ~2.65
 */
export function getDirectRate(fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return 1
  const rates = getExchangeRates()
  const fromUsdRate = rates[fromCurrency] || DEFAULT_USD_RATES[fromCurrency] || 1
  const toUsdRate = rates[toCurrency] || DEFAULT_USD_RATES[toCurrency] || 1

  // Amount in USD = Amount(from) / fromUsdRate
  // Amount in TO = Amount in USD * toUsdRate
  return toUsdRate / fromUsdRate
}

/**
 * Convert minor units from one currency to another minor units.
 */
export function convertMinorUnits(
  minorAmount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (fromCurrency === toCurrency || minorAmount === 0) return minorAmount
  const rate = getDirectRate(fromCurrency, toCurrency)
  return Math.round(minorAmount * rate)
}

/**
 * Format currency with full internationalization and Taiwan / India custom handling.
 */
export function formatCurrencyUniversal(
  minor: number,
  currency = 'TWD',
  locale = 'zh-TW',
  options: Partial<Intl.NumberFormatOptions> = {}
): string {
  const cfg = SUPPORTED_CURRENCIES[currency] || {
    symbol: currency,
    locale: locale || 'en-US',
    decimals: 2,
  }

  // Convert minor units to normal decimal value
  const decimal = minor / 100

  // Format TWD nicely
  if (currency === 'TWD') {
    const formatted = new Intl.NumberFormat('zh-TW', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      ...options,
    }).format(Math.round(decimal))
    return `NT$ ${formatted}`
  }

  // Format INR nicely
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options,
    }).format(decimal)
  }

  try {
    return new Intl.NumberFormat(cfg.locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: cfg.decimals,
      ...options,
    }).format(decimal)
  } catch {
    return `${cfg.symbol} ${decimal.toFixed(cfg.decimals)}`
  }
}

/**
 * Compact currency formatting (e.g. NT$ 15K, ₹1.5L)
 */
export function formatCurrencyUniversalCompact(
  minor: number,
  currency = 'TWD'
): string {
  const decimal = minor / 100

  if (currency === 'INR') {
    if (Math.abs(decimal) >= 10000000) {
      return `₹${(decimal / 10000000).toFixed(1)}Cr`
    }
    if (Math.abs(decimal) >= 100000) {
      return `₹${(decimal / 100000).toFixed(1)}L`
    }
    if (Math.abs(decimal) >= 1000) {
      return `₹${(decimal / 1000).toFixed(1)}K`
    }
    return `₹${Math.round(decimal)}`
  }

  if (currency === 'TWD') {
    if (Math.abs(decimal) >= 1000000) {
      return `NT$ ${(decimal / 1000000).toFixed(1)}M`
    }
    if (Math.abs(decimal) >= 1000) {
      return `NT$ ${(decimal / 1000).toFixed(1)}K`
    }
    return `NT$ ${Math.round(decimal)}`
  }

  if (Math.abs(decimal) >= 1000000) {
    return `${SUPPORTED_CURRENCIES[currency]?.symbol || '$'}${(decimal / 1000000).toFixed(1)}M`
  }
  if (Math.abs(decimal) >= 1000) {
    return `${SUPPORTED_CURRENCIES[currency]?.symbol || '$'}${(decimal / 1000).toFixed(1)}K`
  }
  return formatCurrencyUniversal(minor, currency)
}

/**
 * Convert major units from one currency to another.
 * E.g., convertAmount(100, 'TWD', 'INR') returns ~265
 */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (fromCurrency === toCurrency || amount === 0) return amount
  const rate = getDirectRate(fromCurrency, toCurrency)
  return Math.round(amount * rate * 100) / 100
}

/**
 * Format dual currency badge string e.g. "≈ ₹ 265"
 */
export function formatDualCurrencyBadge(
  minor: number,
  primaryCurrency = 'TWD',
  secondaryCurrency = 'INR'
): string {
  const converted = convertMinorUnits(minor, primaryCurrency, secondaryCurrency)
  return `≈ ${formatCurrencyUniversal(converted, secondaryCurrency)}`
}
