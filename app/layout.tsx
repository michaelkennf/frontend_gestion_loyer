import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { AppProvider } from '@/components/app-provider'
import { PwaInstallPrompt } from '@/components/pwa/install-prompt'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'LocaPro – Gestion Locative',
  description: 'Gérez vos propriétés, loyers et dépenses en toute simplicité.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/icon-192.png', type: 'image/png', sizes: '192x192' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LocaPro',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">
        <AppProvider>
          <ServiceWorkerRegister />
          {children}
          <PwaInstallPrompt />
          <Toaster richColors position="top-right" />
        </AppProvider>
      </body>
    </html>
  )
}
