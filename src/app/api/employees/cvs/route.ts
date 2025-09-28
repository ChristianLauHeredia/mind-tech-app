import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('cvs')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching CVs:', error);
      return new Response('Error fetching CVs', { status: 500 });
    }

    return Response.json(data || []);
  } catch (error) {
    console.error('Error in CVs endpoint:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
