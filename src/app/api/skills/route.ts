import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET() {
  try {
    const { data, error } = await sb
      .from('skills')
      .select('*')
      .order('name');

    if (error) {
      console.error('Database error:', error);
      return new Response(error.message, { status: 400 });
    }

    return Response.json(data || []);
  } catch (error) {
    console.error('Request error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, category } = body;

    if (!name || !name.trim()) {
      return new Response('name is required', { status: 400 });
    }

    // Check if skill already exists
    const { data: existingSkill } = await sb
      .from('skills')
      .select('*')
      .eq('name', name.trim())
      .single();

    if (existingSkill) {
      return new Response('Skill with this name already exists', { status: 400 });
    }

    const { data, error } = await sb
      .from('skills')
      .insert({
        name: name.trim(),
        category: category || 'General'
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
