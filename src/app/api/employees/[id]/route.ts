import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await sb
    .from('employees')
    .select('*')
    .eq('id', params.id)
    .single();
    
  if (error) return new Response(error.message, { status: 404 });
  return Response.json(data);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  
  const { data, error } = await sb
    .from('employees')
    .update(body)
    .eq('id', params.id)
    .select('*');
    
  if (error) return new Response(error.message, { status: 400 });
  return Response.json(data?.[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await sb
    .from('employees')
    .delete()
    .eq('id', params.id);
    
  if (error) return new Response(error.message, { status: 400 });
  return new Response('Employee deleted successfully', { status: 200 });
}
