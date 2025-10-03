import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Enriches candidate data with employee information from database
 */
async function enrichCandidates(candidates: any[], supabase: any) {
  if (!candidates || candidates.length === 0) return [];
  
  const employeeIds = candidates.map((c: any) => c.employee_id).filter(Boolean);
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
  const employeeMap = new Map(employees?.map((emp: any) => [emp.id, emp]) || []);

  // Enrich candidates with employee data
  return candidates.map((candidate: any) => {
    const employee = employeeMap.get(candidate.employee_id) as any;
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

export async function GET(req: NextRequest) {
  try {
    // Validate configuration
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json({ 
        error: 'Database not configured' 
      }, { status: 500 });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build the base query
    let query = supabase
      .from('requests')
      .select(`
        id,
        requester,
        channel_id,
        content,
        attachment_file_id,
        parsed_skills,
        seniority_hint,
        role_hint,
        created_at,
        candidates
      `, { count: 'exact' });

    // Apply limit and offset (order matters: first limit, then offset)
    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.range(offset, offset + limit - 1);
    }

    console.log(`📋 Retrieving requests (offset: ${offset}, limit: ${limit})`);

    const { data: requests, error, count } = await query;

    if (error) {
      console.error('Error fetching requests:', error);
      return Response.json({ 
        error: 'Failed to fetch requests',
        details: error.message 
      }, { status: 500 });
    }

    const totalRequests = requests?.length || 0;
    const hasMore = offset + limit < (count || 0);

    console.log(`📋 Retrieved ${totalRequests} requests (offset: ${offset}, limit: ${limit}, hasMore: ${hasMore})`);

    // Enrich candidates with employee data for each request
    const enrichedRequests = await Promise.all(
      (requests || []).map(async (request) => ({
        ...request,
        candidates: await enrichCandidates(request.candidates || [], supabase)
      }))
    );

    return Response.json({
      items: enrichedRequests,
      total: count || 0,
      limit,
      offset,
      hasMore
    });

  } catch (error) {
    console.error('Get requests error:', error);
    return Response.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}