'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (sessionStorage.getItem('pwa-dismissed')) return

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setPrompt(null)
    setHidden(true)
  }

  function handleDismiss() {
    sessionStorage.setItem('pwa-dismissed', '1')
    setHidden(true)
  }

  if (!prompt || hidden) return null

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
