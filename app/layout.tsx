import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ReduxProvider } from '@/store/providers'
import { Toaster } from '@/components/ui/sonner'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import { ThemeProvider } from '@/components/ThemeProvider'
import PWAInstallBanner from '@/components/PWAInstallBanner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DOPA Mentor Portal',
  description: 'DOPA Education Private Limited — Mentor Management Portal',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DOPA Portal',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1e293b',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <ReduxProvider>
            {children}
            <Toaster richColors position="top-right" />
            <PWAInstallBanner />
          </ReduxProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
