import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from "@/components/auth/AuthProvider"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { QueryProvider } from "@/lib/providers/QueryProvider"

const inter = Inter({ subsets: ['latin'] })

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'TASAVIA - Aviation Technical & Commercial Services | ISO9001 Certified',
    template: '%s | TASAVIA'
  },
  description: 'ISO9001 certified aviation technical and commercial services provider. Expert aircraft teardown, component sales, repair management, and technical consultancy. Your trusted partner to keep aircrafts flying safely and efficiently worldwide.',
  keywords: [
    'aviation services',
    'aircraft teardown',
    'aircraft maintenance',
    'aviation components',
    'aircraft parts',
    'repair management',
    'technical consultancy',
    'ISO9001 certified',
    'aviation technical services',
    'aircraft dismantling',
    'component recovery',
    'parts exchange',
    'aviation logistics',
    'airworthiness',
    'aircraft trading'
  ],
  authors: [{ name: 'TASAVIA', url: 'https://tasavia.com' }],
  creator: 'TASAVIA',
  publisher: 'TASAVIA',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://tasavia.com',
    title: 'TASAVIA - Aviation Technical & Commercial Services',
    description: 'ISO9001 certified aviation technical and commercial services provider. Your partner to keep aircrafts flying.',
    siteName: 'TASAVIA',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'TASAVIA - Aviation Technical & Commercial Services'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TASAVIA - Aviation Technical & Commercial Services',
    description: 'ISO9001 certified aviation technical and commercial services provider. Your partner to keep aircrafts flying.',
    images: ['/twitter-image.png'],
    creator: '@tasavia',
    site: '@tasavia'
  },
  alternates: {
    canonical: 'https://tasavia.com',
  },
  category: 'Aviation Services',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <QueryProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </QueryProvider>
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  )
}