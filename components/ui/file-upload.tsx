'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Upload, 
  FileText, 
  X, 
  Eye, 
  Download,
  AlertCircle,
  CheckCircle,
  Loader2 
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface UploadedFile {
  id: string
  name: string
  size: number
  url: string
  path: string
  uploadedAt: Date
}

interface FileUploadProps {
  maxFiles?: number
  maxSizeBytes?: number
  acceptedFileTypes?: string[]
  bucketName?: string
  folderPath?: string
  onFilesChange?: (files: UploadedFile[]) => void
  existingFiles?: UploadedFile[]
  disabled?: boolean
  className?: string
}

export default function FileUpload({
  maxFiles = 5,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB default
  acceptedFileTypes = ['application/pdf'],
  bucketName = 'traceability-documents',
  folderPath = '',
  onFilesChange,
  existingFiles = [],
  disabled = false,
  className
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Validate file before upload
  const validateFile = useCallback((file: File): string | null => {
    if (!acceptedFileTypes.includes(file.type)) {
      return `File type not supported. Please upload ${acceptedFileTypes.includes('application/pdf') ? 'PDF' : 'supported'} files only.`
    }
    
    if (file.size > maxSizeBytes) {
      return `File size too large. Maximum size is ${Math.round(maxSizeBytes / (1024 * 1024))}MB.`
    }

    if (files.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed.`
    }

    return null
  }, [acceptedFileTypes, maxSizeBytes, files.length, maxFiles])

  // Generate unique file path
  const generateFilePath = useCallback((fileName: string): string => {
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    return folderPath 
      ? `${folderPath}/traceability-${timestamp}-${randomId}-${sanitizedName}`
      : `traceability-${timestamp}-${randomId}-${sanitizedName}`
  }, [folderPath])

  // Upload file to Supabase storage
  const uploadFile = useCallback(async (file: File): Promise<UploadedFile | null> => {
    const filePath = generateFilePath(file.name)
    const fileId = Math.random().toString(36).substring(2, 15)
    
    try {
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }))

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        toast.error(`Failed to upload ${file.name}: ${error.message}`)
        return null
      }

      // Get public URL
      const { data: publicData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath)

      const uploadedFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        url: publicData.publicUrl,
        path: filePath,
        uploadedAt: new Date()
      }

      setUploadProgress(prev => ({ ...prev, [fileId]: 100 }))
      
      // Clean up progress after a delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[fileId]
          return newProgress
        })
      }, 2000)

      return uploadedFile
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error(`Failed to upload ${file.name}`)
      return null
    }
  }, [bucketName, generateFilePath])

  // Handle file selection
  const handleFiles = useCallback(async (selectedFiles: FileList) => {
    if (disabled) return

    const fileArray = Array.from(selectedFiles)
    setIsUploading(true)

    const validFiles = fileArray.filter(file => {
      const error = validateFile(file)
      if (error) {
        toast.error(error)
        return false
      }
      return true
    })

    if (validFiles.length === 0) {
      setIsUploading(false)
      return
    }

    try {
      const uploadPromises = validFiles.map(uploadFile)
      const uploadedFiles = await Promise.all(uploadPromises)
      const successfulUploads = uploadedFiles.filter((file): file is UploadedFile => file !== null)

      if (successfulUploads.length > 0) {
        const updatedFiles = [...files, ...successfulUploads]
        setFiles(updatedFiles)
        onFilesChange?.(updatedFiles)
        toast.success(`Successfully uploaded ${successfulUploads.length} file(s)`)
      }
    } catch (error) {
      console.error('Upload process failed:', error)
      toast.error('Upload process failed')
    } finally {
      setIsUploading(false)
    }
  }, [disabled, files, onFilesChange, uploadFile, validateFile])

  // Delete file
  const deleteFile = async (fileToDelete: UploadedFile) => {
    try {
      // Delete from Supabase storage
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([fileToDelete.path])

      if (error) {
        console.error('Delete error:', error)
        toast.error(`Failed to delete ${fileToDelete.name}`)
        return
      }

      const updatedFiles = files.filter(file => file.id !== fileToDelete.id)
      setFiles(updatedFiles)
      onFilesChange?.(updatedFiles)
      toast.success(`${fileToDelete.name} deleted successfully`)
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('Failed to delete file')
    }
  }

  // Download file
  const downloadFile = async (file: UploadedFile) => {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(file.path)

      if (error) {
        toast.error('Failed to download file')
        return
      }

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Failed to download file')
    }
  }

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (disabled) return

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles)
    }
  }, [disabled, handleFiles])

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          isDragging && !disabled
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFileTypes.join(',')}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
          disabled={disabled}
        />

        <div className="space-y-2">
          <div className="flex justify-center">
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            ) : (
              <Upload className="h-8 w-8 text-gray-400" />
            )}
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-900">
              {isUploading ? 'Uploading...' : 'Upload traceability documents'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Drag and drop PDF files here, or click to select
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Max {maxFiles} files, {Math.round(maxSizeBytes / (1024 * 1024))}MB per file
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Uploading...</span>
                <span className="text-sm text-gray-600">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">
            Uploaded Files ({files.length})
          </h4>
          
          <div className="space-y-2">
            {files.map((file) => (
              <Card key={file.id} className="p-3">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-red-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)} • {file.uploadedAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(file.url, '_blank')}
                        className="h-8 w-8"
                        title="View file"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => downloadFile(file)}
                        className="h-8 w-8"
                        title="Download file"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteFile(file)}
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                        title="Delete file"
                        disabled={disabled}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}