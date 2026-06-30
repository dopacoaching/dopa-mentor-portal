'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function detectIOS() {
  const ua = navigator.userAgent
  // iPhone/iPod/iPad (incl. iPad on iOS 13+ which reports as Macintosh)
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document)
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (('standalone' in window.navigator) &&
      (window.navigator as { standalone?: boolean }).standalone === true)
  )
}

export default function PWAInstallBanner() {
  const [androidPrompt, setAndroidPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOS, setShowIOS] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    if (sessionStorage.getItem('pwa-dismissed')) return

    if (detectIOS()) {
      setShowIOS(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setAndroidPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!androidPrompt) return
    await androidPrompt.prompt()
    const { outcome } = await androidPrompt.userChoice
    if (outcome === 'accepted') setAndroidPrompt(null)
    setHidden(true)
  }

  function handleDismiss() {
    sessionStorage.setItem('pwa-dismissed', '1')
    setHidden(true)
  }

  if (hidden || (!androidPrompt && !showIOS)) return null

  if (showIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-dopa-slate text-white px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.25)]">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Install DOPA Portal</p>
            <p className="text-xs text-white/70 mt-0.5">
              Tap the{' '}
              <span className="inline-flex items-center gap-0.5 font-semibold">
                <svg className="w-3.5 h-3.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                Share
              </span>{' '}
              button then <span className="font-semibold">&quot;Add to Home Screen&quot;</span>
            </p>
          </div>
          <button onClick={handleDismiss} className="text-white/50 hover:text-white flex-shrink-0 p-1 mt-0.5 -mr-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-dopa-slate text-white px-4 py-3 flex items-center gap-3 shadow-[0_-2px_12px_rgba(0,0,0,0.25)]">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Install DOPA Portal</p>
        <p className="text-xs text-white/60 truncate">Add to home screen for quick access</p>
      </div>
      <button
        onClick={handleInstall}
        className="flex items-center gap-1.5 bg-dopa-green text-white text-sm font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
      >
        <Download className="w-3.5 h-3.5" />
        Install
      </button>
      <button onClick={handleDismiss} className="text-white/50 hover:text-white flex-shrink-0 p-1 -mr-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
