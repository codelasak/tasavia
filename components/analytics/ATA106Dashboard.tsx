'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, TrendingUp, FileText, PenTool, Clock, Users } from 'lucide-react'
import { useATA106Analytics } from '@/lib/hooks/useATA106Analytics'
import { format } from 'date-fns'

export function ATA106Dashboard() {
  const { data: metrics, isLoading, error } = useATA106Analytics()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading analytics...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-red-600 text-center">
            <div className="font-semibold">Error loading analytics</div>
            <div className="text-sm mt-1">{error.message}</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total ATA 106 Forms</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_forms}</div>
            <p className="text-xs text-muted-foreground">
              Forms requiring ATA 106 certification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completion_rate.toFixed(1)}%</div>
            <Progress value={Math.min(100, Math.max(0, metrics.completion_rate || 0))} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.completed_forms} of {metrics.total_forms} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Digital Signatures</CardTitle>
            <PenTool className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.signature_completion_rate.toFixed(1)}%</div>
            <Progress value={Math.min(100, Math.max(0, metrics.signature_completion_rate || 0))} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.forms_with_signatures} forms have signatures
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Completion Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.average_completion_time_hours > 24 
                ? `${(metrics.average_completion_time_hours / 24).toFixed(1)}d`
                : `${metrics.average_completion_time_hours.toFixed(1)}h`
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Time from creation to completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Form Status Breakdown</CardTitle>
            <CardDescription>Current status of all ATA 106 forms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">Draft</Badge>
                  <span className="text-sm text-muted-foreground">Not started</span>
                </div>
                <span className="font-bold">{metrics.forms_by_status.draft}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="border-orange-200 text-orange-800">Partial</Badge>
                  <span className="text-sm text-muted-foreground">In progress</span>
                </div>
                <span className="font-bold">{metrics.forms_by_status.partial}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>
                  <span className="text-sm text-muted-foreground">Fully certified</span>
                </div>
                <span className="font-bold">{metrics.forms_by_status.completed}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity (7 days)</CardTitle>
            <CardDescription>ATA 106 form activity in the last week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Forms created</span>
                </div>
                <span className="font-bold text-blue-600">
                  {metrics.recent_activity.forms_created_last_7_days}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Forms completed</span>
                </div>
                <span className="font-bold text-green-600">
                  {metrics.recent_activity.forms_completed_last_7_days}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <PenTool className="h-4 w-4 text-purple-600" />
                  <span className="text-sm">Signatures added</span>
                </div>
                <span className="font-bold text-purple-600">
                  {metrics.recent_activity.signatures_added_last_7_days}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Companies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Top Companies by ATA 106 Forms</span>
          </CardTitle>
          <CardDescription>Companies with the most ATA 106 certification requirements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.top_companies.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No company data available
              </div>
            ) : (
              metrics.top_companies.map((company, index) => (
                <div key={company.company_name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{company.company_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {company.form_count} forms • {company.completion_rate.toFixed(1)}% completion rate
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Progress value={Math.min(100, Math.max(0, company.completion_rate || 0))} className="w-20" />
                    <span className="text-sm font-medium w-8">
                      {company.completion_rate.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Progress indicator component for individual forms
interface ATA106ProgressProps {
  salesOrderId: string
  compact?: boolean
}

export function ATA106Progress({ salesOrderId, compact = false }: ATA106ProgressProps) {
  const { data: progress, isLoading } = useATA106Analytics()

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (!progress) {
    return null
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <Progress value={75} className="w-16 h-2" />
        <span className="text-xs text-muted-foreground">75%</span>
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">ATA 106 Completion Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Overall Progress</span>
            <span className="text-sm font-medium">75%</span>
          </div>
          <Progress value={75} className="w-full" />
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Form Created</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span>Transferor Signed</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span>Transferee Pending</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span>Completion Pending</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}