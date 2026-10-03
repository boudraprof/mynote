/**
 * Performance monitoring utilities
 * Tracks Core Web Vitals and custom metrics
 */
import logger from '@/utils/logger'

// Type definitions for Layout Shift API
declare global {
  interface LayoutShift extends PerformanceEntry {
    value: number
    hadRecentInput: boolean
  }
}

interface Metric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
}

export interface AnalyticsProvider {
  sendMetric: (metric: Metric) => void
  sendEvent?: (name: string, params?: Record<string, unknown>) => void
}

// Core Web Vitals thresholds
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FID: { good: 100, poor: 300 },   // First Input Delay
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
  INP: { good: 200, poor: 500 },   // Interaction to Next Paint
}

function getRating(name: string, value: number): Metric['rating'] {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS]
  if (!threshold) return 'good'

  if (value <= threshold.good) return 'good'
  if (value <= threshold.poor) return 'needs-improvement'
  return 'poor'
}

let analyticsProvider: AnalyticsProvider | null = null

/**
 * Set the analytics provider for sending metrics
 */
export function setAnalyticsProvider(provider: AnalyticsProvider): void {
  analyticsProvider = provider
}

/**
 * Report a metric to analytics
 */
function reportMetric(metric: Metric) {
  // Send to configured analytics provider
  if (analyticsProvider) {
    try {
      analyticsProvider.sendMetric(metric)
    } catch {
      // Don't let analytics errors break the app
    }
  }

  // Log in development
  if (import.meta.env.DEV) {
    logger.debug(`[Performance] ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`, 'Perf')
  }

  // Store in localStorage for debugging
  try {
    const stored = JSON.parse(localStorage.getItem('perf-metrics') || '[]')
    stored.push(metric)
    // Keep only last 100 metrics
    if (stored.length > 100) stored.shift()
    localStorage.setItem('perf-metrics', JSON.stringify(stored))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Observe Core Web Vitals using Performance Observer
 */
export function observeWebVitals() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return
  }

  // Observe Largest Contentful Paint (LCP)
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      if (lastEntry) {
        const metric: Metric = {
          name: 'LCP',
          value: lastEntry.startTime,
          rating: getRating('LCP', lastEntry.startTime),
          timestamp: Date.now(),
        }
        reportMetric(metric)
      }
    })
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
  } catch {
    // LCP not supported
  }

  // Observe First Input Delay (FID)
  try {
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      for (const entry of entries) {
        const fidEntry = entry as PerformanceEventTiming
        const fid = fidEntry.processingStart - fidEntry.startTime
        const metric: Metric = {
          name: 'FID',
          value: fid,
          rating: getRating('FID', fid),
          timestamp: Date.now(),
        }
        reportMetric(metric)
      }
    })
    fidObserver.observe({ type: 'first-input', buffered: true })
  } catch {
    // FID not supported
  }

  // Observe Cumulative Layout Shift (CLS)
  try {
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      for (const entry of entries) {
        const clsEntry = entry as LayoutShift
        if (!clsEntry.hadRecentInput) {
          clsValue += clsEntry.value
        }
      }
      const metric: Metric = {
        name: 'CLS',
        value: clsValue,
        rating: getRating('CLS', clsValue),
        timestamp: Date.now(),
      }
      reportMetric(metric)
    })
    clsObserver.observe({ type: 'layout-shift', buffered: true })
  } catch {
    // CLS not supported
  }

  // Observe Navigation Timing (TTFB)
  try {
    const navObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      for (const entry of entries) {
        const navEntry = entry as PerformanceNavigationTiming
        const ttfb = navEntry.responseStart - navEntry.requestStart
        if (ttfb > 0) {
          const metric: Metric = {
            name: 'TTFB',
            value: ttfb,
            rating: getRating('TTFB', ttfb),
            timestamp: Date.now(),
          }
          reportMetric(metric)
        }
      }
    })
    navObserver.observe({ type: 'navigation', buffered: true })
  } catch {
    // Navigation timing not supported
  }
}

/**
 * Measure custom performance timing
 */
export function measureTiming(name: string) {
  const start = performance.now()

  return {
    end: () => {
      const duration = performance.now() - start
      const metric: Metric = {
        name,
        value: duration,
        rating: duration < 100 ? 'good' : duration < 300 ? 'needs-improvement' : 'poor',
        timestamp: Date.now(),
      }
      reportMetric(metric)
      return duration
    },
  }
}

/**
 * Get stored performance metrics
 */
export function getStoredMetrics(): Array<Metric> {
  try {
    return JSON.parse(localStorage.getItem('perf-metrics') || '[]')
  } catch {
    return []
  }
}

/**
 * Clear stored performance metrics
 */
export function clearStoredMetrics() {
  localStorage.removeItem('perf-metrics')
}

/**
 * Report API response time
 */
export function measureApiCall(name: string) {
  return measureTiming(`api:${name}`)
}

/**
 * Report page load time
 */
export function measurePageLoad(pageName: string) {
  if (typeof window === 'undefined') return

  window.addEventListener('load', () => {
    const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (timing) {
      const loadTime = timing.loadEventEnd - timing.fetchStart
      const metric: Metric = {
        name: `page:${pageName}`,
        value: loadTime,
        rating: loadTime < 1000 ? 'good' : loadTime < 3000 ? 'needs-improvement' : 'poor',
        timestamp: Date.now(),
      }
      reportMetric(metric)
    }
  })
}
