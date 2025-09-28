import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await sb
      .from('matches')
      .select(`
        score,
        summary,
        reason_features,
        employees!inner(
          id,
          first_name,
          last_name,
          email,
          position,
          seniority,
          location
        )
      `)
      .eq('request_id', params.id)
      .order('score', { ascending: false });
      
    if (error) {
      return new Response(error.message, { status: 500 });
    }
    
    // Transformar los datos para que sean más fáciles de usar
    const transformedData = data?.map(match => ({
      employee_id: (match.employees as any).id,
      employee_name: `${(match.employees as any).first_name} ${(match.employees as any).last_name}`,
      email: (match.employees as any).email,
      position: (match.employees as any).position,
      seniority: (match.employees as any).seniority,
      location: (match.employees as any).location,
      score: match.score,
      summary: match.summary,
      reason_features: match.reason_features
    })) || [];
    
    return Response.json(transformedData);
  } catch (error) {
    console.error('Error fetching matches:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
