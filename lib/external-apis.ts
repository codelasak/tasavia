/**
 * External API utilities for aviation compliance and validation
 * Enhanced with multiple API sources for robust aviation data validation
 * Includes ICAO Official, AviationStack, Aviation Edge, REST Countries, and FAA Registry
 */

// Enhanced types for API responses
interface AirlineData {
  airline_id: string
  airline_name: string
  iata_code: string
  icao_code: string
  callsign: string
  country_name: string
  country_iso2: string
  status: string
  type: string
  is_active?: boolean
}

interface CountryData {
  name: {
    common: string
    official: string
  }
  cca2: string
  cca3: string
  ccn3?: string
  region: string
  subregion: string
}

interface AircraftData {
  msn: string
  registration?: string
  manufacturer?: string
  model?: string
  is_valid: boolean
  status: string
  source?: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  source: string
}

interface AviationStackResponse {
  pagination: {
    limit: number
    offset: number
    count: number
    total: number
  }
  data: AirlineData[]
}

// API Configuration - Enhanced with multiple sources
const AVIATIONSTACK_BASE_URL = 'https://api.aviationstack.com/v1'
const AVIATIONSTACK_API_KEY = process.env.NEXT_PUBLIC_AVIATIONSTACK_API_KEY

const ICAO_BASE_URL = 'https://applications.icao.int/dataservices'
const ICAO_API_KEY = process.env.ICAO_API_KEY

const AVIATION_EDGE_BASE_URL = 'https://aviation-edge.com/v2/public'
const AVIATION_EDGE_API_KEY = process.env.AVIATION_EDGE_API_KEY

const COUNTRIES_BASE_URL = 'https://restcountries.com/v3.1'

const FAA_BASE_URL = 'https://registry.faa.gov'
const FAA_API_KEY = process.env.FAA_API_KEY

// Cache for API responses (in-memory cache)
const apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>()

/**
 * Enhanced airline data fetching with multiple API sources and caching
 * Priority: ICAO Official → AviationStack → Aviation Edge → Mock Data
 */
export async function fetchAirlines(searchTerm?: string, limit: number = 100): Promise<AirlineData[]> {
  const cacheKey = `airlines_${searchTerm || 'all'}_${limit}`
  
  // Check cache first
  const cached = getFromCache(cacheKey, 60) // 1 hour cache
  if (cached) {
    return cached
  }

  // Try ICAO Official API first (most authoritative)
  try {
    const icaoData = await fetchAirlinesFromICAO(searchTerm, limit)
    if (icaoData.length > 0) {
      setCache(cacheKey, icaoData, 60)
      return icaoData
    }
  } catch (error) {
    console.warn('ICAO API failed:', error)
  }

  // Fallback to AviationStack API
  try {
    if (AVIATIONSTACK_API_KEY) {
      const params = new URLSearchParams({
        access_key: AVIATIONSTACK_API_KEY,
        limit: limit.toString(),
      })

      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await fetch(`${AVIATIONSTACK_BASE_URL}/airlines?${params}`)
      
      if (response.ok) {
        const data: AviationStackResponse = await response.json()
        const airlines = data.data || []
        setCache(cacheKey, airlines, 60)
        return airlines
      }
    }
  } catch (error) {
    console.warn('AviationStack API failed:', error)
  }

  // Fallback to Aviation Edge API
  try {
    const aviationEdgeData = await fetchAirlinesFromAviationEdge(searchTerm, limit)
    if (aviationEdgeData.length > 0) {
      setCache(cacheKey, aviationEdgeData, 60)
      return aviationEdgeData
    }
  } catch (error) {
    console.warn('Aviation Edge API failed:', error)
  }

  // Final fallback to mock data
  console.warn('All airline APIs failed, returning mock data')
  const mockData = getMockAirlines(searchTerm)
  setCache(cacheKey, mockData, 10) // Shorter cache for mock data
  return mockData
}

/**
 * Fetch airlines from ICAO Official API
 */
async function fetchAirlinesFromICAO(searchTerm?: string, limit: number = 100): Promise<AirlineData[]> {
  if (!ICAO_API_KEY) {
    throw new Error('ICAO API key not configured')
  }

  const params = new URLSearchParams({
    limit: limit.toString(),
  })

  if (searchTerm) {
    params.append('search', searchTerm)
  }

  const response = await fetch(`${ICAO_BASE_URL}/api/airlines?${params}`, {
    headers: {
      'Authorization': `Bearer ${ICAO_API_KEY}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`ICAO API error: ${response.status}`)
  }

  const data = await response.json()
  
  return (data.airlines || []).map((airline: any) => ({
    airline_id: airline.id || airline.iataCode,
    airline_name: airline.name,
    iata_code: airline.iataCode || '',
    icao_code: airline.icaoCode || '',
    callsign: airline.callsign || '',
    country_name: airline.countryName || '',
    country_iso2: airline.countryCode || '',
    status: airline.isActive ? 'active' : 'inactive',
    type: airline.type || 'scheduled',
    is_active: airline.isActive
  }))
}

/**
 * Fetch airlines from Aviation Edge API
 */
async function fetchAirlinesFromAviationEdge(searchTerm?: string, limit: number = 100): Promise<AirlineData[]> {
  if (!AVIATION_EDGE_API_KEY) {
    throw new Error('Aviation Edge API key not configured')
  }

  const params = new URLSearchParams({
    key: AVIATION_EDGE_API_KEY,
    limit: limit.toString(),
  })

  if (searchTerm) {
    params.append('search', searchTerm)
  }

  const response = await fetch(`${AVIATION_EDGE_BASE_URL}/airlineDatabase?${params}`)
  
  if (!response.ok) {
    throw new Error(`Aviation Edge API error: ${response.status}`)
  }

  const data = await response.json()
  
  return data.map((airline: any) => ({
    airline_id: airline.airlineId || airline.iataCode,
    airline_name: airline.nameAirline,
    iata_code: airline.iataCode || '',
    icao_code: airline.icaoCode || '',
    callsign: airline.callsign || '',
    country_name: airline.nameCountry || '',
    country_iso2: airline.codeIso2Country || '',
    status: airline.statusAirline || 'unknown',
    type: airline.type || 'scheduled',
    is_active: airline.statusAirline === 'active'
  }))
}

/**
 * Validate airline by IATA or ICAO code
 */
export async function validateAirline(code: string): Promise<AirlineData | null> {
  try {
    const airlines = await fetchAirlines(code, 10)
    return airlines.find(airline => 
      airline.iata_code?.toLowerCase() === code.toLowerCase() ||
      airline.icao_code?.toLowerCase() === code.toLowerCase()
    ) || null
  } catch (error) {
    console.error('Error validating airline:', error)
    return null
  }
}

/**
 * Country name overrides for official names and corrections
 */
function applyCountryNameOverrides(countryName: string): string {
  const overrides: { [key: string]: string } = {
    'Turkey': 'Türkiye',
    // Add other country name overrides as needed
  }
  return overrides[countryName] || countryName
}

/**
 * Fetch countries from REST Countries API
 */
export async function fetchCountries(): Promise<{ name: string; code: string; region: string }[]> {
  try {
    const response = await fetch(`${COUNTRIES_BASE_URL}/all?fields=name,cca2,region`)

    if (!response.ok) {
      throw new Error(`REST Countries API error: ${response.status}`)
    }

    const data: CountryData[] = await response.json()

    return data
      .map(country => ({
        name: applyCountryNameOverrides(country.name.common),
        code: country.cca2,
        region: country.region
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error('Error fetching countries:', error)
    return getMockCountries()
  }
}

/**
 * Fetch countries with priority ordering for Purchase Order Origin Country field
 * Shows ALL countries with priority countries (USA, UK, Germany, France) at the top
 * for easy selection, followed by all other countries alphabetically
 */
export async function getCountriesWithPriorityOrdering(): Promise<{ name: string; code: string; region: string }[]> {
  try {
    const allCountries = await fetchCountries()
    const priorityCountries = ['United States', 'United Kingdom', 'Germany', 'France']

    // Separate priority countries from others
    const priorityList = allCountries.filter(country => priorityCountries.includes(country.name))
    const otherCountries = allCountries.filter(country => !priorityCountries.includes(country.name))

    // Sort priority countries in desired order
    const sortedPriority = priorityList.sort((a, b) => {
      const order = ['United States', 'United Kingdom', 'Germany', 'France']
      return order.indexOf(a.name) - order.indexOf(b.name)
    })

    // Sort other countries alphabetically
    const sortedOthers = otherCountries.sort((a, b) => a.name.localeCompare(b.name))

    // Combine: priority countries first, then all others
    return [...sortedPriority, ...sortedOthers]
  } catch (error) {
    console.error('Error fetching purchase order origin countries:', error)
    // Fallback to mock data with priority countries first
    const priorityFallback = [
      { name: 'United States', code: 'US', region: 'Americas' },
      { name: 'United Kingdom', code: 'GB', region: 'Europe' },
      { name: 'Germany', code: 'DE', region: 'Europe' },
      { name: 'France', code: 'FR', region: 'Europe' }
    ]

    // Add some common fallback countries
    const otherFallback = [
      { name: 'Canada', code: 'CA', region: 'Americas' },
      { name: 'Italy', code: 'IT', region: 'Europe' },
      { name: 'Spain', code: 'ES', region: 'Europe' },
      { name: 'Netherlands', code: 'NL', region: 'Europe' },
      { name: 'Japan', code: 'JP', region: 'Asia' },
      { name: 'Australia', code: 'AU', region: 'Oceania' }
    ]

    return [...priorityFallback, ...otherFallback.sort((a, b) => a.name.localeCompare(b.name))]
  }
}

/**
 * Enhanced MSN validation with multiple API sources
 * Validates both format and existence in aviation databases
 */
export async function validateMSN(msn: string): Promise<ApiResponse<AircraftData>> {
  const trimmedMSN = msn.trim()
  const cacheKey = `msn_${trimmedMSN}`
  
  // Check cache first
  const cached = getFromCache(cacheKey, 30) // 30 minute cache
  if (cached) {
    return cached
  }

  // Basic format validation first
  if (!isValidMSNFormat(trimmedMSN)) {
    const response: ApiResponse<AircraftData> = {
      success: false,
      error: 'Invalid MSN format',
      source: 'format_validation'
    }
    setCache(cacheKey, response, 10) // Short cache for invalid formats
    return response
  }

  // Try FAA registry first for comprehensive validation
  try {
    const faaResult = await validateMSNWithFAA(trimmedMSN)
    if (faaResult.success) {
      setCache(cacheKey, faaResult, 30)
      return faaResult
    }
  } catch (error) {
    console.warn('FAA MSN validation failed:', error)
  }

  // Fallback to Aviation Edge API
  try {
    const aviationEdgeResult = await validateMSNWithAviationEdge(trimmedMSN)
    if (aviationEdgeResult.success) {
      setCache(cacheKey, aviationEdgeResult, 30)
      return aviationEdgeResult
    }
  } catch (error) {
    console.warn('Aviation Edge MSN validation failed:', error)
  }

  // Return format validation result if no API validation succeeds
  const formatResult: ApiResponse<AircraftData> = {
    success: true,
    data: {
      msn: trimmedMSN,
      is_valid: true,
      status: 'format_valid_not_verified',
      source: 'format_validation'
    },
    source: 'format_validation'
  }
  
  setCache(cacheKey, formatResult, 5) // Very short cache for unverified
  return formatResult
}

/**
 * Basic MSN format validation
 */
function isValidMSNFormat(msn: string): boolean {
  // Enhanced MSN validation patterns
  const msnPatterns = [
    /^[0-9]{3,10}$/, // Numeric only: 12345, 123456789
    /^MSN[0-9]{3,10}$/i, // MSN prefix: MSN12345
    /^[A-Z]{1,3}[0-9]{3,10}$/i, // Manufacturer prefix: B1234, A380001
    /^[A-Z0-9\-]{4,20}$/i, // General alphanumeric with dashes
  ]
  
  return msnPatterns.some(pattern => pattern.test(msn))
}

/**
 * Validate MSN with FAA Registry
 */
async function validateMSNWithFAA(msn: string): Promise<ApiResponse<AircraftData>> {
  // Try multiple FAA endpoints
  const endpoints = [
    `${FAA_BASE_URL}/aircraftinquiry/Search/SerialResult?serialtxt=${msn}`,
    `https://api.beliefmedia.com/platform/sources/aircraft/faa/faa.json?apikey=${FAA_API_KEY}&serial=${msn}`
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint)
      if (response.ok) {
        const data = await response.json()
        
        if (data && (data.registration || data.serial)) {
          return {
            success: true,
            data: {
              msn: data.serial || msn,
              registration: data.registration || data.nNumber || '',
              manufacturer: data.manufacturer || data.make || '',
              model: data.model || data.aircraftModel || '',
              is_valid: true,
              status: 'verified',
              source: 'faa_registry'
            },
            source: 'faa_registry'
          }
        }
      }
    } catch (error) {
      console.warn(`FAA endpoint failed: ${endpoint}`, error)
      continue
    }
  }

  throw new Error('FAA validation failed')
}

/**
 * Validate MSN with Aviation Edge
 */
async function validateMSNWithAviationEdge(msn: string): Promise<ApiResponse<AircraftData>> {
  if (!AVIATION_EDGE_API_KEY) {
    throw new Error('Aviation Edge API key not configured')
  }

  const response = await fetch(`${AVIATION_EDGE_BASE_URL}/airplanes?key=${AVIATION_EDGE_API_KEY}&serialNumber=${msn}`)
  
  if (!response.ok) {
    throw new Error(`Aviation Edge API error: ${response.status}`)
  }

  const data = await response.json()
  
  if (!data || data.length === 0) {
    throw new Error('MSN not found in Aviation Edge database')
  }

  const aircraft = data[0]
  
  return {
    success: true,
    data: {
      msn: aircraft.serialNumber || msn,
      registration: aircraft.regNumber || '',
      manufacturer: aircraft.manufacturerName || '',
      model: aircraft.modelName || '',
      is_valid: true,
      status: 'verified',
      source: 'aviation_edge'
    },
    source: 'aviation_edge'
  }
}

/**
 * Cache management functions
 */
function getFromCache(key: string, maxAgeMinutes: number): any | null {
  const cached = apiCache.get(key)
  if (!cached) return null
  
  const now = Date.now()
  const maxAge = maxAgeMinutes * 60 * 1000
  
  if (now - cached.timestamp > maxAge) {
    apiCache.delete(key)
    return null
  }
  
  return cached.data
}

function setCache(key: string, data: any, ttlMinutes: number): void {
  apiCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMinutes
  })
  
  // Basic cache cleanup - remove expired entries
  if (apiCache.size > 1000) {
    const now = Date.now()
    for (const [k, v] of apiCache.entries()) {
      if (now - v.timestamp > v.ttl * 60 * 1000) {
        apiCache.delete(k)
      }
    }
  }
}

/**
 * Mock airline data for development/fallback
 */
function getMockAirlines(searchTerm?: string): AirlineData[] {
  const mockAirlines: AirlineData[] = [
    {
      airline_id: '1',
      airline_name: 'American Airlines',
      iata_code: 'AA',
      icao_code: 'AAL',
      callsign: 'AMERICAN',
      country_name: 'United States',
      country_iso2: 'US',
      status: 'active',
      type: 'scheduled'
    },
    {
      airline_id: '2',
      airline_name: 'Delta Air Lines',
      iata_code: 'DL',
      icao_code: 'DAL',
      callsign: 'DELTA',
      country_name: 'United States',
      country_iso2: 'US',
      status: 'active',
      type: 'scheduled'
    },
    {
      airline_id: '3',
      airline_name: 'United Airlines',
      iata_code: 'UA',
      icao_code: 'UAL',
      callsign: 'UNITED',
      country_name: 'United States',
      country_iso2: 'US',
      status: 'active',
      type: 'scheduled'
    },
    {
      airline_id: '4',
      airline_name: 'Lufthansa',
      iata_code: 'LH',
      icao_code: 'DLH',
      callsign: 'LUFTHANSA',
      country_name: 'Germany',
      country_iso2: 'DE',
      status: 'active',
      type: 'scheduled'
    },
    {
      airline_id: '5',
      airline_name: 'British Airways',
      iata_code: 'BA',
      icao_code: 'BAW',
      callsign: 'SPEEDBIRD',
      country_name: 'United Kingdom',
      country_iso2: 'GB',
      status: 'active',
      type: 'scheduled'
    },
    {
      airline_id: '6',
      airline_name: 'Turkish Airlines',
      iata_code: 'TK',
      icao_code: 'THY',
      callsign: 'TURKAIR',
      country_name: 'Türkiye',
      country_iso2: 'TR',  
      status: 'active',
      type: 'scheduled'
    }
  ]

  if (searchTerm) {
    return mockAirlines.filter(airline =>
      airline.airline_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      airline.iata_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      airline.icao_code.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  return mockAirlines
}

/**
 * Mock country data for development/fallback
 */
function getMockCountries(): { name: string; code: string; region: string }[] {
  return [
    { name: 'United States', code: 'US', region: 'Americas' },
    { name: 'Germany', code: 'DE', region: 'Europe' },
    { name: 'United Kingdom', code: 'GB', region: 'Europe' },
    { name: 'France', code: 'FR', region: 'Europe' },
    { name: 'Canada', code: 'CA', region: 'Americas' },
    { name: 'Australia', code: 'AU', region: 'Oceania' },
    { name: 'Japan', code: 'JP', region: 'Asia' },
    { name: 'Türkiye', code: 'TR', region: 'Asia' },
    { name: 'Brazil', code: 'BR', region: 'Americas' },
    { name: 'India', code: 'IN', region: 'Asia' },
    { name: 'China', code: 'CN', region: 'Asia' },
    { name: 'Mexico', code: 'MX', region: 'Americas' },
    { name: 'Spain', code: 'ES', region: 'Europe' },
    { name: 'Italy', code: 'IT', region: 'Europe' },
    { name: 'Netherlands', code: 'NL', region: 'Europe' },
    { name: 'Sweden', code: 'SE', region: 'Europe' },
    { name: 'Norway', code: 'NO', region: 'Europe' },
    { name: 'Denmark', code: 'DK', region: 'Europe' },
    { name: 'Switzerland', code: 'CH', region: 'Europe' },
    { name: 'Austria', code: 'AT', region: 'Europe' },
    { name: 'Belgium', code: 'BE', region: 'Europe' },
    { name: 'Finland', code: 'FI', region: 'Europe' },
    { name: 'Ireland', code: 'IE', region: 'Europe' },
    { name: 'Portugal', code: 'PT', region: 'Europe' },
  ].sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Get regulatory authorities for aviation compliance
 */
export function getRegulatoryAuthorities(): { name: string; code: string; country: string }[] {
  return [
    { name: 'Federal Aviation Administration', code: 'FAA', country: 'US' },
    { name: 'European Union Aviation Safety Agency', code: 'EASA', country: 'EU' },
    { name: 'Civil Aviation Authority', code: 'CAA', country: 'UK' },
    { name: 'Transport Canada Civil Aviation', code: 'TCCA', country: 'CA' },
    { name: 'Civil Aviation Safety Authority', code: 'CASA', country: 'AU' },
    { name: 'Japan Civil Aviation Bureau', code: 'JCAB', country: 'JP' },
    { name: 'Directorate General of Civil Aviation', code: 'SHGM', country: 'TR' },
    { name: 'Agência Nacional de Aviação Civil', code: 'ANAC', country: 'BR' },
    { name: 'Directorate General of Civil Aviation', code: 'DGCA', country: 'IN' },
    { name: 'Civil Aviation Administration of China', code: 'CAAC', country: 'CN' },
  ].sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Utility function to get aviation-specific countries list
 */
export async function getAviationCountries(): Promise<{ name: string; code: string; region: string }[]> {
  const countries = await fetchCountries()
  
  // Filter for major aviation countries
  const aviationCountryCodes = [
    'US', 'CA', 'MX', 'BR', 'AR', 'GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 
    'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'IE', 'PT', 'TR', 'GR', 'RU', 'UA',
    'JP', 'CN', 'KR', 'TH', 'MY', 'SG', 'ID', 'PH', 'VN', 'IN', 'PK', 'BD',
    'AU', 'NZ', 'ZA', 'EG', 'MA', 'AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'JO', 'IL'
  ]
  
  return countries.filter(country => aviationCountryCodes.includes(country.code))
}

/**
 * Clear API cache
 */
export function clearApiCache(): void {
  apiCache.clear()
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: apiCache.size,
    keys: Array.from(apiCache.keys())
  }
}

// Export types for use in components
export type { AirlineData, CountryData, AircraftData, ApiResponse }