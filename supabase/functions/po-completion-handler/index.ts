import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing authorization header. Please ensure you are logged in.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 401 
        }
      )
    }

    // Create Supabase client with proper authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    // Verify user authentication by getting user data
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    
    if (userError || !userData.user) {
      console.error('Authentication failed:', userError?.message)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authentication failed. Please log in again.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 401 
        }
      )
    }

    console.log(`Authenticated user: ${userData.user.email || userData.user.id}`)

    // Parse request body with validation
    let requestBody
    try {
      requestBody = await req.json()
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      )
    }

    const { po_id, action } = requestBody

    if (!po_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameter: po_id' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      )
    }

    if (!action) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameter: action' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      )
    }

    if (action === 'complete_po') {
      console.log(`Processing PO completion for PO ID: ${po_id} by user: ${userData.user.email || userData.user.id}`)

      // First verify the PO exists and is in a valid state
      const { data: poData, error: poError } = await supabaseClient
        .from('purchase_orders')
        .select('po_id, po_number, status')
        .eq('po_id', po_id)
        .single()

      if (poError) {
        console.error('Error fetching PO data:', poError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to fetch purchase order: ${poError.message}`,
            code: 'PO_FETCH_ERROR'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 400 
          }
        )
      }

      if (!poData) {
        console.error(`PO not found: ${po_id}`)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Purchase order not found: ${po_id}`,
            code: 'PO_NOT_FOUND'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 404 
          }
        )
      }

      console.log(`Found PO: ${poData.po_number} with status: ${poData.status}`)

      // Call the database function to create inventory items
      console.log('Calling create_inventory_from_po_completion function...')
      const { data, error } = await supabaseClient.rpc('create_inventory_from_po_completion', {
        input_po_id: po_id
      })

      if (error) {
        console.error('Database function error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Database operation failed: ${error.message}`,
            details: error.details,
            hint: error.hint,
            code: error.code || 'DB_FUNCTION_ERROR'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 500 
          }
        )
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        console.error('Database function returned no data')
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Database function returned no results',
            code: 'NO_DATA_RETURNED'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 500 
          }
        )
      }

      const result = data[0]
      console.log('Database function result:', result)
      
      if (!result.success) {
        console.log(`Failed to create inventory items: ${result.error_message}`)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: result.error_message || 'Unknown database error',
            created_count: result.created_count || 0,
            code: 'INVENTORY_CREATION_FAILED'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 400 
          }
        )
      }

      console.log(`Successfully created ${result.created_count} inventory items for PO ${poData.po_number}`)
      
      return new Response(
        JSON.stringify({
          success: true,
          created_count: result.created_count,
          inventory_ids: result.inventory_ids,
          po_number: poData.po_number,
          message: `Successfully created ${result.created_count} inventory items from PO ${poData.po_number}`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (action === 'get_po_preview') {
      console.log(`Getting PO preview for PO ID: ${po_id} by user: ${userData.user.email || userData.user.id}`)

      // Get PO items that would be created as inventory
      const { data: poItems, error } = await supabaseClient
        .from('po_items')
        .select(`
          quantity,
          unit_price,
          condition,
          description,
          pn_master_table (
            pn,
            description
          )
        `)
        .eq('po_id', po_id)

      if (error) {
        console.error('Error fetching PO items:', error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to fetch PO items: ${error.message}`,
            code: 'PO_ITEMS_FETCH_ERROR'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 400 
          }
        )
      }

      console.log(`Found ${poItems?.length || 0} PO items for preview`)

      return new Response(
        JSON.stringify({
          success: true,
          po_items: poItems || [],
          total_items: poItems?.length || 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Invalid action '${action}'. Supported actions: complete_po, get_po_preview`,
        code: 'INVALID_ACTION'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 400 
      }
    )

  } catch (error) {
    console.error('Unexpected error in Edge Function:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error',
        code: 'INTERNAL_ERROR'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})