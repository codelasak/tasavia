import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from './server'

export const supabase = createClientComponentClient<Database>() 