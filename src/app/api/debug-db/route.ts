import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json({
        error: 'Database not configured',
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }, { status: 500 });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL, 
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test employee count
    const { count: employeesCount, error: employeesError } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });

    // Test employee data
    const { data: employeesData, error: employeesDataError } = await supabase
      .from('employees')
      .select('id, name, email')
      .limit(3);

    // Test requests count
    const { count: requestsCount, error: requestsError } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true });

    if (employeesError) {
      return Response.json({
        error: 'Error getting employees count',
        details: employeesError.message,
        code: employeesError.code
      }, { status: 500 });
    }

    if (employeesDataError) {
      return Response.json({
        error: 'Error getting employees data',
        details: employeesDataError.message,
        code: employeesDataError.code
      }, { status: 500 });
    }

    if (requestsError) {
      return Response.json({
        error: 'Error getting requests count',
        details: requestsError.message,
        code: requestsError.code
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      employeesCount,
      employeesData: employeesData || [],
      requestsCount: requestsCount || 0,
      connectionWorking: true
    });

  } catch (error) {
    console.error('Debug DB error:', error);
    return Response.json({
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
