import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json({ error: 'Missing environment variables' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL, 
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get sample requests to see their structure
    const { data: requestsData, error: requestsError } = await supabase
      .from('requests')
      .select('id, parsed_skills, content, candidates')
      .limit(5);

    if (requestsError) {
      return Response.json({
        error: 'Error getting requests',
        details: requestsError.message
      }, { status: 500 });
    }

    // Analyze the data structure
    const analysis = requestsData?.map(request => ({
      id: request.id,
      contentLength: request.content?.length || 0,
      hasParsedSkills: !!request.parsed_skills,
      parsedSkillsType: typeof request.parsed_skills,
      parsedSkillsValue: request.parsed_skills,
      hasCandidates: request.candidates ? (Array.isArray(request.candidates) ? request.candidates.length : 'not array') : false,
      candidatesSample: Array.isArray(request.candidates) ? request.candidates.slice(0, 2) : request.candidates
    })) || [];

    return Response.json({
      success: true,
      totalRequests: requestsData?.length || 0,
      analysis,
      rawSample: requestsData?.[0] // Show complete structure of first request
    });

  } catch (error) {
    console.error('Debug requests error:', error);
    return Response.json({
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
