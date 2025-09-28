import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// GET - Obtener skills de un empleado específico
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const { data, error } = await sb
      .from('employee_skills')
      .select(`
        employee_id,
        skill_id,
        level,
        years,
        skills (
          name,
          category
        )
      `)
      .eq('employee_id', id);

    if (error) {
      console.error('Database error:', error);
      return new Response(error.message, { status: 400 });
    }

    // Transform the data
    const transformedData = data?.map(item => ({
      employee_id: item.employee_id,
      skill_id: item.skill_id,
      skill_name: Array.isArray(item.skills) ? (item.skills[0] as any)?.name || 'Unknown' : (item.skills as any)?.name || 'Unknown',
      proficiency_level: item.level || 1,
      years: item.years || 0
    })) || [];

    return Response.json(transformedData);
  } catch (error) {
    console.error('Request error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// POST - Agregar skill a un empleado
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { skill_id, proficiency_level, years } = body;

    if (!skill_id) {
      return new Response('skill_id is required', { status: 400 });
    }

    const { error } = await sb
      .from('employee_skills')
      .insert({
        employee_id: id,
        skill_id,
        level: proficiency_level || 3,
        years: years || 0
      });

    if (error) {
      console.error('Database error:', error);
      return new Response(error.message, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Request error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
