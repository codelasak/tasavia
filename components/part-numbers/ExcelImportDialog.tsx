'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface ExcelImportDialogProps {
  open: boolean
  onClose: () => void
}

interface ImportProgress {
  total: number
  processed: number
  errors: string[]
}

export function ExcelImportDialog({ open, onClose }: ExcelImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<ImportProgress>({ total: 0, processed: 0, errors: [] })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          selectedFile.type === 'application/vnd.ms-excel') {
        setFile(selectedFile)
      } else {
        toast.error('Please select a valid Excel file (.xlsx or .xls)')
      }
    }
  }

  const processExcelFile = async () => {
    if (!file) return

    setImporting(true)
    setProgress({ total: 0, processed: 0, errors: [] })

    try {
      const XLSX = await import('xlsx')
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      if (jsonData.length < 2) {
        throw new Error('Excel file must contain at least a header row and one data row')
      }

      // Assuming the Excel has columns: PN, Description, Remarks
      const [headers, ...rows] = jsonData as string[][]
      const pnIndex = headers.findIndex(h => h?.toLowerCase().includes('pn') || h?.toLowerCase().includes('part'))
      const descIndex = headers.findIndex(h => h?.toLowerCase().includes('desc'))
      const remarksIndex = headers.findIndex(h => h?.toLowerCase().includes('remark') || h?.toLowerCase().includes('note'))

      if (pnIndex === -1) {
        throw new Error('Could not find a Part Number column. Please ensure your Excel has a column with "PN" or "Part" in the header.')
      }

      setProgress(prev => ({ ...prev, total: rows.length }))

      const errors: string[] = []
      let processed = 0

      for (const row of rows) {
        try {
          const pn = row[pnIndex]?.toString().trim()
          if (!pn) {
            errors.push(`Row ${processed + 2}: Part number is empty`)
            continue
          }

          const description = descIndex >= 0 ? row[descIndex]?.toString().trim() || null : null
          const remarks = remarksIndex >= 0 ? row[remarksIndex]?.toString().trim() || null : null

          const { error } = await supabase
            .from('pn_master_table')
            .upsert({
              pn,
              description,
              remarks
            }, {
              onConflict: 'pn'
            })

          if (error) {
            errors.push(`Row ${processed + 2}: ${error.message}`)
          }
        } catch (error: any) {
          errors.push(`Row ${processed + 2}: ${error.message}`)
        }

        processed++
        setProgress(prev => ({ ...prev, processed, errors }))
      }

      if (errors.length === 0) {
        toast.success(`Successfully imported ${processed} part numbers`)
        onClose()
      } else {
        toast.warning(`Import completed with ${errors.length} errors. ${processed - errors.length} part numbers imported successfully.`)
      }
    } catch (error: any) {
      console.error('Error importing Excel file:', error)
      toast.error(`Error importing Excel file: ${error.message}`)
    } finally {
      setImporting(false)
    }
  }

  const resetDialog = () => {
    setFile(null)
    setProgress({ total: 0, processed: 0, errors: [] })
  }

  const handleClose = () => {
    if (!importing) {
      resetDialog()
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Part Numbers from Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file to import part numbers. Expected columns: PN (required), Description, Remarks.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {!importing && (
            <>
              <div>
                <Label htmlFor="file">Excel File</Label>
                <div className="mt-1">
                  <Input
                    id="file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    disabled={importing}
                  />
                </div>
                {file && (
                  <div className="flex items-center mt-2 text-sm text-slate-600">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    {file.name}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Excel Format Requirements:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• First row should contain column headers</li>
                  <li>• Must have a column with &quot;PN&quot; or &quot;Part&quot; in the header (required)</li>
                  <li>• Optional columns: &quot;Description&quot;, &quot;Remarks&quot;</li>
                  <li>• Empty part numbers will be skipped</li>
                  <li>• Duplicate part numbers will be updated</li>
                </ul>
              </div>
            </>
          )}

          {importing && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Import Progress</span>
                  <span className="text-sm text-slate-600">
                    {progress.processed} / {progress.total}
                  </span>
                </div>
                <Progress 
                  value={progress.total > 0 ? (progress.processed / progress.total) * 100 : 0} 
                  className="h-2"
                />
              </div>

              {progress.errors.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg max-h-32 overflow-y-auto">
                  <div className="flex items-center text-red-800 font-medium mb-2">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Import Errors
                  </div>
                  <div className="text-sm text-red-700 space-y-1">
                    {progress.errors.slice(0, 10).map((error, index) => (
                      <div key={index}>{error}</div>
                    ))}
                    {progress.errors.length > 10 && (
                      <div>... and {progress.errors.length - 10} more errors</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={importing}
          >
            {importing ? 'Importing...' : 'Cancel'}
          </Button>
          {!importing && (
            <Button 
              onClick={processExcelFile}
              disabled={!file}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}