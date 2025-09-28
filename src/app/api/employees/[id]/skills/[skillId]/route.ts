import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// PUT - Actualizar skill de un empleado
export async function PUT(req: NextRequest, { params }: { params: { id: string, skillId: string } }) {
  try {
    const { id, skillId } = params;
    const body = await req.json();
    const { proficiency_level, years } = body;

    const { error } = await sb
      .from('employee_skills')
      .update({
        level: proficiency_level,
        years: years
      })
      .eq('employee_id', id)
      .eq('skill_id', skillId);

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

// DELETE - Eliminar skill de un empleado
export async function DELETE(req: NextRequest, { params }: { params: { id: string, skillId: string } }) {
  try {
    const { id, skillId } = params;

    const { error } = await sb
      .from('employee_skills')
      .delete()
      .eq('employee_id', id)
      .eq('skill_id', skillId);

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
