import { createClient } from '@supabase/supabase-js';
import { config } from './config';

// Crear cliente Supabase con manejo de configuración faltante
export function createSupabaseClient(useServiceRole = false) {
  if (!config.supabase.isConfigured) {
    return null;
  }
  
  const supabaseUrl = config.supabase.url!;
  const supabaseKey = useServiceRole 
    ? config.supabase.serviceRoleKey! 
    : config.supabase.anonKey!;
    
  return createClient(supabaseUrl, supabaseKey);
}

// Clientes por defecto
export const supabase = createSupabaseClient();
export const supabaseServiceRole = createSupabaseClient(true);