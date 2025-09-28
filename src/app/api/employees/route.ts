import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET() {
  const { data } = await sb.from('employees').select('*').limit(100);
  return Response.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, error } = await sb.from('employees').insert(body).select('*');
  if (error) return new Response(error.message, { status: 400 });
  return Response.json(data?.[0]);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...updateData } = body;
  
  if (!id) return new Response('ID is required for update', { status: 400 });
  
  const { data, error } = await sb
    .from('employees')
    .update(updateData)
    .eq('id', id)
    .select('*');
    
  if (error) return new Response(error.message, { status: 400 });
  return Response.json(data?.[0]);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  
  if (!id) return new Response('ID is required for deletion', { status: 400 });
  
  const { error } = await sb
    .from('employees')
    .delete()
    .eq('id', id);
    
  if (error) return new Response(error.message, { status: 400 });
  return new Response('Employee deleted successfully', { status: 200 });
}
