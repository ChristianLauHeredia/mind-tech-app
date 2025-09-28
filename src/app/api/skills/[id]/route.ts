import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// PUT - Actualizar skill
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { name, category } = body;

    if (!name || !name.trim()) {
      return new Response('name is required', { status: 400 });
    }

    // Check if skill already exists (excluding current skill)
    const { data: existingSkill } = await sb
      .from('skills')
      .select('*')
      .eq('name', name.trim())
      .neq('id', id)
      .single();

    if (existingSkill) {
      return new Response('Skill with this name already exists', { status: 400 });
    }

    const { data, error } = await sb
      .from('skills')
      .update({
        name: name.trim(),
        category: category || 'General'
      })
      .eq('id', id)
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

// DELETE - Eliminar skill
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Check if skill is being used by any employee
    const { data: employeeSkills, error: checkError } = await sb
      .from('employee_skills')
      .select('employee_id')
      .eq('skill_id', id)
      .limit(1);

    if (checkError) {
      console.error('Database error:', checkError);
      return new Response(checkError.message, { status: 400 });
    }

    if (employeeSkills && employeeSkills.length > 0) {
      return new Response('Cannot delete skill that is assigned to employees. Please remove all assignments first.', { status: 400 });
    }

    const { error } = await sb
      .from('skills')
      .delete()
      .eq('id', id);

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
