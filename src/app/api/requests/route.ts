import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Input validation schema for saving requests
const RequestSchema = z.object({
  requester: z.string().optional(),
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
  })).min(1) // Array of candidate objects with their summary
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
    const parsedData = RequestSchema.parse(body);
    
    // Apply defaults manually
    const validatedData = {
      ...parsedData,
      requester: parsedData.requester || 'n8n@system',
      channel_id: parsedData.channel_id || 'n8n-webhook'
    };
    
    const { 
      requester, 
      channel_id, 
      content, 
      attachment_file_id,
      parsed_skills,
      seniority_hint,
      role_hint,
      candidates
    } = validatedData;

    // Create Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log(`💾 Saving request: "${content.substring(0, 50)}..." with ${candidates.length} candidates`);

    // Insert the request with candidates directly in the same record
    const { data: requestData, error: requestError } = await supabase
      .from('requests')
      .insert({
        requester,
        channel_id,
        content,
        attachment_file_id,
        parsed_skills,
        seniority_hint,
        role_hint,
        candidates // Store candidates directly as JSON
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

    console.log(`✅ Request saved with ID: ${requestData.id} with ${candidates.length} candidates`);

    return Response.json({
      success: true,
      request_id: requestData.id,
      candidates_count: candidates.length
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

    // Get requests with candidates stored directly
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
        candidates
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