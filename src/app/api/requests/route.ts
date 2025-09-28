import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const role = searchParams.get('role') || '';
    const skill = (searchParams.get('skill') || '').toLowerCase();
    const seniority = searchParams.get('seniority') || '';
    const channel = searchParams.get('channel') || '';
    const limit = Math.min(Number(searchParams.get('limit') || 50), 100);
    const offset = Math.max(Number(searchParams.get('offset') || 0), 0);

    let query = sb.from('requests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Búsqueda de texto en requester o content
    if (q) {
      query = query.or(`requester.ilike.%${q}%,content.ilike.%${q}%`);
    }

    // Filtro por rol (en parsed_skills o role_hint)
    if (role) {
      query = query.or(`parsed_skills->>role.ilike.%${role}%,role_hint.ilike.%${role}%`);
    }

    // Filtro por seniority (en parsed_skills o seniority_hint)
    if (seniority) {
      query = query.or(`parsed_skills->>seniority.eq.${seniority},seniority_hint.eq.${seniority}`);
    }

    // Filtro por canal
    if (channel) {
      query = query.ilike('channel_id', `%${channel}%`);
    }

    // Filtrado por skill dentro de parsed_skills.must_have / nice_to_have
    if (skill) {
      query = query.or(
        `parsed_skills->must_have.cs.["${skill}"],parsed_skills->nice_to_have.cs.["${skill}"]`
      );
    }

    const { data, error, count } = await query;
    
    if (error) {
      console.error('Database error:', error);
      return new Response(error.message, { status: 400 });
    }

    return Response.json({ 
      items: data ?? [], 
      total: count ?? 0,
      limit,
      offset,
      hasMore: (offset + limit) < (count ?? 0)
    });
  } catch (error) {
    console.error('Request error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { requester, channel_id, content, parsed_skills, seniority_hint, role_hint } = body;
    
    if (!requester || !content) {
      return new Response('requester and content are required', { status: 400 });
    }
    
    const { data, error } = await sb
      .from('requests')
      .insert({
        requester,
        channel_id: channel_id ?? null,
        content,
        parsed_skills: parsed_skills ?? null,
        seniority_hint: seniority_hint ?? null,
        role_hint: role_hint ?? null
      })
      .select('*')
      .single();
      
    if (error) {
      console.error('Database error:', error);
      return new Response(error.message, { status: 400 });
    }
    
    return Response.json(data);
  } catch (error) {
    console.error('Request error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
