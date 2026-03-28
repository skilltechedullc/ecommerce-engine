'use client'

type EventPayload = Record<string, string | number | boolean | null | undefined>

export function trackEvent(eventName: string, payload: EventPayload = {}) {
  if (typeof window === 'undefined') return

  const eventPayload = {
    ...payload,
    timestamp: Date.now(),
  }

  const win = window as Window & {
    dataLayer?: Array<Record<string, unknown>>
    gtag?: (command: string, event: string, params?: Record<string, unknown>) => void
  }

  if (Array.isArray(win.dataLayer)) {
    win.dataLayer.push({ event: eventName, ...eventPayload })
  }

  if (typeof win.gtag === 'function') {
    win.gtag('event', eventName, eventPayload)
  }

  window.dispatchEvent(new CustomEvent('millco-analytics', { detail: { eventName, payload: eventPayload } }))
}
