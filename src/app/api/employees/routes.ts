import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
export async function GET() { const { data } = await sb.from('employees').select('*').limit(100); return Response.json(data); }
export async function POST(req: NextRequest) { const body = await req.json(); const { data, error } = await sb.from('employees').insert(body).select('*'); if (error) return new Response(error.message, { status: 400 }); return Response.json(data?.[0]); }