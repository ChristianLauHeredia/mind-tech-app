import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CVIndexRequest {
  employee_id: string;
  cv_data: string; // JSON object as string
}

export async function POST(req: NextRequest) {
  try {
    const body: CVIndexRequest = await req.json();
    const { employee_id, cv_data } = body;

    if (!employee_id) {
      return Response.json({ error: 'employee_id is required' }, { status: 400 });
    }

    if (!cv_data) {
      return Response.json({ error: 'cv_data is required' }, { status: 400 });
    }

    // Validate that cv_data is valid JSON
    let parsedCvData;
    try {
      parsedCvData = JSON.parse(cv_data);
    } catch (error) {
      return Response.json({ error: 'cv_data must be valid JSON string' }, { status: 400 });
    }

    // Required fields validation
    if (!parsedCvData.role || !parsedCvData.seniority || !Array.isArray(parsedCvData.must_have)) {
      return Response.json({ 
        error: 'cv_data must include: role, seniority, must_have (array)' 
      }, { status: 400 });
    }

    console.log(`📋 Indexing CV for employee ${employee_id}`);

    // Store CV index in database
    const { data: indexData, error: indexError } = await supabase
      .from('cv_index')
      .upsert({
        employee_id,
        plain_text: cv_data, // Store the JSON string as plain_text
        last_indexed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (indexError) {
      console.error('CV index error:', indexError);
      return Response.json({ error: 'Failed to save CV index' }, { status: 500 });
    }

    console.log(`✅ CV indexed successfully for employee ${employee_id}`);

    return Response.json({
      ...indexData,
      message: 'CV indexed successfully',
      parsed_cv_data: parsedCvData,
      cv_keys: Object.keys(parsedCvData)
    });

  } catch (error: any) {
    console.error('CV index error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const employee_id = url.searchParams.get('employee_id');

    if (!employee_id) {
      return Response.json({ 
        error: 'Missing employee_id parameter' 
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('cv_index')
      .select('employee_id, plain_text, last_indexed_at')
      .eq('employee_id', employee_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return Response.json({ error: 'CV index not found' }, { status: 404 });
      }
      return Response.json({ error: 'Database query failed' }, { status: 500 });
    }

    // Try to parse the stored CV data
    let parsedCvData = null;
    try {
      parsedCvData = JSON.parse(data.plain_text);
    } catch (error) {
      // Plain text is not JSON, return as is
    }

    return Response.json({
      employee_id: data.employee_id,
      last_indexed_at: data.last_indexed_at,
      cv_data: parsedCvData || data.plain_text,
      cv_is_json: parsedCvData !== null
    });

  } catch (error) {
    console.error('CV index GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
