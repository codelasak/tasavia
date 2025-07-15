import { supabase } from './supabase/client'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export class ApiError extends Error {
  public status: number
  public code?: string

  constructor(message: string, status: number = 500, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/**
 * Standardized API client for making authenticated requests
 */
export class ApiClient {
  private async getAuthToken(): Promise<string> {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Session error:', error)
      throw new ApiError('Session error: ' + error.message, 401)
    }
    
    if (!session?.access_token) {
      throw new ApiError('Not authenticated - please sign in again', 401)
    }
    
    return session.access_token
  }

  async request<T = any>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = await this.getAuthToken()
      
      const response = await fetch(endpoint, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage: string
        
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.error || `Server error: ${response.status}`
        } catch {
          errorMessage = `Server error: ${response.status} - ${errorText}`
        }
        
        throw new ApiError(errorMessage, response.status)
      }

      const result = await response.json()
      return result as ApiResponse<T>
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      console.error('API request error:', error)
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error occurred'
      )
    }
  }

  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

/**
 * Hook-style API client for React components
 */
export function useApiClient() {
  return apiClient
}