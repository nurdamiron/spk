import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Строй Трекер',
  description: 'Ежедневный учёт на объектах: выполнение и расходы',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Строй Трекер', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/favicon-32.png', apple: '/icons/apple-touch-icon.png' },
  other: { 'mobile-web-app-capable': 'yes' },
}

export const viewport: Viewport = {
  themeColor: '#185fa5',
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
