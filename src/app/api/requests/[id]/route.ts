import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    if (!id) {
      return new Response('Request ID is required', { status: 400 });
    }

    const { data, error } = await sb
      .from('requests')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Database error:', error);
      if (error.code === 'PGRST116') {
        return new Response('Request not found', { status: 404 });
      }
      return new Response(error.message, { status: 400 });
    }
    
    return Response.json(data);
  } catch (error) {
    console.error('Request error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
