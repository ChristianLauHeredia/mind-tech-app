import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Enriches candidate data with employee information from database
 */
async function enrichCandidates(candidates: any[], supabase: any) {
  if (!candidates || candidates.length === 0) return [];
  
  const employeeIds = candidates.map(c => c.employee_id).filter(Boolean);
  if (employeeIds.length === 0) return candidates;

  // Fetch employee data
  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email, seniority, location')
    .in('id', employeeIds);

  if (error) {
    console.error('Error fetching employee data:', error);
    return candidates;
  }

  // Create a map for quick lookup
  const employeeMap = new Map(employees?.map(emp => [emp.id, emp]) || []);

  // Enrich candidates with employee data
  return candidates.map(candidate => {
    const employee = employeeMap.get(candidate.employee_id);
    if (employee) {
      return {
        ...candidate,
        name: `${employee.first_name} ${employee.last_name}`,
        email: employee.email,
        seniority: employee.seniority,
        location: employee.location
      };
    }
    return candidate;
  });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    if (!id) {
      return new Response('Request ID is required', { status: 400 });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Database error:', error);
      if (error.code === 'PGRST116') {
        return new Response('Request not found', { status: 404 });
      }
      return new Response(error.message, { status: 400 });
    }

    // Enrich candidates with employee data
    const enrichedData = {
      ...data,
      candidates: await enrichCandidates(data.candidates || [], supabase)
    };
    
    return Response.json(enrichedData);
  } catch (error) {
    console.error('Request error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}