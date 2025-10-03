import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Input validation schema for saving requests
const RequestSchema = z.object({
  requester: z.string().min(1),
  channel_id: z.string().optional(),
  content: z.string().min(1),
  attachment_file_id: z.string().optional(),
  parsed_skills: z.object({
    role: z.string().optional(),
    seniority: z.string().optional(),
    must_have: z.array(z.string()).optional(),
    nice_to_have: z.array(z.string()).optional(),
    extra_keywords: z.array(z.string()).optional()
  }).optional(),
  seniority_hint: z.enum(['JR', 'SSR', 'SR', 'STAFF', 'PRINC']).optional(),
  role_hint: z.string().optional(),
  candidates: z.array(z.object({
    employee_id: z.string().uuid(),
    summary: z.string().min(1), // Individual summary from n8n for this candidate
    score: z.number().min(0).max(1).optional(), // Optional score if n8n provides it
    match_details: z.object({
      matched_skills: z.array(z.string()).optional(),
      seniority_match: z.boolean().optional(),
      role_match: z.boolean().optional()
    }).optional()
  })).min(1), // Array of candidate objects with their summary
  overall_summary: z.string().optional() // Optional overall summary
});

type RequestData = z.infer<typeof RequestSchema>;

export async function POST(req: NextRequest) {
  try {
    // Validate configuration
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json({ 
        error: 'Database not configured' 
      }, { status: 500 });
    }

    // Parse and validate input
    const body = await req.json();
    const validatedData: RequestData = RequestSchema.parse(body);
    
    const { 
      requester, 
      channel_id, 
      content, 
      attachment_file_id,
      parsed_skills,
      seniority_hint,
      role_hint,
      candidates,
      overall_summary
    } = validatedData;

    // Create Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log(`💾 Saving request: "${content.substring(0, 50)}..." with ${candidate_ids.length} candidates`);

    // Insert the request
    const { data: requestData, error: requestError } = await supabase
      .from('requests')
      .insert({
        requester,
        channel_id,
        content,
        attachment_file_id,
        parsed_skills,
        seniority_hint,
        role_hint
      })
      .select('id')
      .single();

    if (requestError) {
      console.error('Error creating request:', requestError);
      return Response.json({ 
        error: 'Failed to create request',
        details: requestError.message 
      }, { status: 500 });
    }

    const requestId = requestData.id;

    // Insert matches for each candidate with individual summaries from n8n
    const matchesData = candidates.map((candidate, index) => ({
      request_id: requestId,
      employee_id: candidate.employee_id,
      score: candidate.score || Math.max(0.1, 1 - (index * 0.1)), // Use n8n score or default decreasing score
      summary: candidate.summary, // Individual summary from n8n
      reason_features: {
        source: 'n8n_match',
        match_order: index + 1,
        total_candidates: candidates.length,
        match_details: candidate.match_details || null,
        n8n_summary: candidate.summary // Store summary in reason_features for easy access
      }
    }));

    const { error: matchesError } = await supabase
      .from('matches')
      .insert(matchesData);

    if (matchesError) {
      console.error('Error creating matches:', matchesError);
      // Clean up the request if matches fail
      await supabase
        .from('requests')
        .delete()
        .eq('id', requestId);
        
      return Response.json({ 
        error: 'Failed to save matches',
        details: matchesError.message 
      }, { status: 500 });
    }

    console.log(`✅ Request saved with ID: ${requestId}, ${matchesData.length} matches created`);

    return Response.json({
      success: true,
      request_id: requestId,
      candidates_count: candidates.length,
      candidates: candidates.map(c => ({
        employee_id: c.employee_id,
        summary: c.summary,
        score: c.score
      })),
      overall_summary: overall_summary,
      message: 'Request and candidates saved successfully with individual summaries'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ 
        error: `Invalid input: ${error.errors.map(e => e.message).join(', ')}` 
      }, { status: 400 });
    }
    
    console.error('Request endpoint error:', error);
    return Response.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
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

    // Get requests with matches and candidate info
    const { data: requests, error } = await supabase
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
        matches!inner (
          request_id,
          employee_id,
          score,
          summary,
          reason_features,
          employees (
            id,
            first_name,
            last_name,
            email,
            seniority,
            location
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
      return Response.json({ 
        error: 'Failed to fetch requests',
        details: error.message 
      }, { status: 500 });
    }

    console.log(`📋 Retrieved ${requests?.length || 0} requests`);

    return Response.json({
      requests: requests || [],
      total: requests?.length || 0
    });

  } catch (error) {
    console.error('Get requests error:', error);
    return Response.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}