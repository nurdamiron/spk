import type { Metadata, Viewport } from 'next'
import './globals.css'
import { startupImages } from '@/lib/splash'

export const metadata: Metadata = {
  title: 'Строй Трекер',
  description: 'Ежедневный учёт на объектах: выполнение и расходы',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Строй Трекер', statusBarStyle: 'default', startupImage: startupImages },
  icons: { icon: '/icons/favicon-32.png', apple: '/icons/apple-touch-icon.png' },
  other: { 'mobile-web-app-capable': 'yes' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f2f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
