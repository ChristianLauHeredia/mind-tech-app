import { NextRequest } from 'next/server';

// Copy of /api/match but without authentication for n8n testing
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('🔬 NOV8N test data received:', body);

    // Return a simple test response
    return Response.json({
      success: true,
      message: 'Test endpoint working',
      received_data: body,
      test_candidates: [
        {
          employee_id: 'test-123',
          name: 'Test Candidate',
          email: 'test@example.com',
          location: 'Test Location',
          seniority: 'SR',
          cv_index: { test: 'data' },
          match_score: 1.0,
          matched_skills: ['react'],
          match_quality: 'test'
        }
      ]
    });

  } catch (error) {
    console.error('🚨 NOV8N test error:', error);
    return Response.json({ 
      error: 'Test error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({
    message: 'Test endpoint is working',
    timestamp: new Date().toISOString()
  });
}
