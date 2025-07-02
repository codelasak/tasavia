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
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      supabaseClient.auth.setSession({
        access_token: authHeader.replace('Bearer ', ''),
        refresh_token: '',
      })
    }

    const { po_id, action } = await req.json()

    if (action === 'complete_po') {
      console.log(`Processing PO completion for PO ID: ${po_id}`)

      // Call the database function to create inventory items
      const { data, error } = await supabaseClient.rpc('create_inventory_from_po_completion', {
        input_po_id: po_id
      })

      if (error) {
        console.error('Error creating inventory items:', error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error.message,
            details: error.details 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 400 
          }
        )
      }

      const result = data[0]
      
      if (!result.success) {
        console.log(`Failed to create inventory items: ${result.error_message}`)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: result.error_message,
            created_count: result.created_count
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 400 
          }
        )
      }

      console.log(`Successfully created ${result.created_count} inventory items`)
      
      return new Response(
        JSON.stringify({
          success: true,
          created_count: result.created_count,
          inventory_ids: result.inventory_ids,
          message: `Successfully created ${result.created_count} inventory items from PO completion`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (action === 'get_po_preview') {
      console.log(`Getting PO preview for PO ID: ${po_id}`)

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
            error: error.message 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 400 
          }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          po_items: poItems,
          total_items: poItems.length
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Invalid action. Supported actions: complete_po, get_po_preview' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 400 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})