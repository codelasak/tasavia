'use client'

import { ErrorBoundary } from '@/components/error-boundary/ErrorBoundary'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ReactNode } from 'react'

interface SalesOrderErrorBoundaryProps {
  children: ReactNode
}

function SalesOrderErrorFallback() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
      
      <Card className="mx-auto max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-red-900">Sales Order Error</CardTitle>
          <CardDescription>
            An error occurred while processing the sales order. This could be due to a network issue, 
            data validation problem, or temporary system unavailability.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-sm text-slate-600">
            Please try refreshing the page or navigating back to the sales orders list. 
            If the problem persists, please contact support.
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => router.push('/portal/sales-orders')}>
              Go to Sales Orders
            </Button>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function SalesOrderErrorBoundary({ children }: SalesOrderErrorBoundaryProps) {
  return (
    <ErrorBoundary fallback={<SalesOrderErrorFallback />}>
      {children}
    </ErrorBoundary>
  )
}