import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from "@/components/auth/AuthProvider"

const inter = Inter({ subsets: ['latin'] })

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'TASAVIA - Aviation Technical & Commercial Services',
  description: 'ISO9001 certified aviation technical and commercial services provider. Your partner to keep aircrafts flying.',
  keywords: 'aviation, aircraft, teardown, maintenance, repair, components, parts, technical services',
  authors: [{ name: 'TASAVIA' }],
  openGraph: {
    title: 'TASAVIA - Aviation Technical & Commercial Services',
    description: 'ISO9001 certified aviation technical and commercial services provider. Your partner to keep aircrafts flying.',
    type: 'website',
    locale: 'en_US',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  )
}