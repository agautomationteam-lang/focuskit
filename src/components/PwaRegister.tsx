'use client'

import { useEffect } from 'react'

export default function PwaRegister() {
  useEffect(() => {
    // Service worker (PWA)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Capacitor: status bar + notification channel setup
    void initCapacitor()
  }, [])

  return null
}

async function initCapacitor() {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      document.documentElement.classList.add('capacitor-native')
    }
  } catch { /* web - no-op */ }

  // Status bar — dark background, light icons
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setOverlaysWebView({ overlay: false })
    await StatusBar.setStyle({ style: Style.Light })       // light icons on dark bg
    await StatusBar.setBackgroundColor({ color: '#0b0d14' })
  } catch { /* web — no-op */ }

  // Local notifications — create review-alert channel (Android 8+)
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.createChannel({
      id: 'reviews',
      name: 'Review Alerts',
      importance: 5,
      description: 'Alerts for new Google reviews',
      sound: 'default',
      vibration: true,
      visibility: 1,
    })
    await LocalNotifications.requestPermissions()
  } catch { /* web — no-op */ }

  // Push notifications — request permission
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const perm = await PushNotifications.requestPermissions()
    if (perm.receive === 'granted') await PushNotifications.register()
  } catch { /* web — no-op */ }
}
