import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET() {
  try {
    const { data, error } = await sb
      .from('employee_skills')
      .select(`
        employee_id,
        level,
        skills (
          name,
          category
        )
      `);

    if (error) {
      console.error('Database error:', error);
      return new Response(error.message, { status: 400 });
    }

    // Transform the data to match our interface
    const transformedData = data?.map(item => ({
      employee_id: item.employee_id,
      skill_name: item.skills?.name || 'Unknown',
      proficiency_level: item.level || 1
    })) || [];

    return Response.json(transformedData);
  } catch (error) {
    console.error('Request error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
