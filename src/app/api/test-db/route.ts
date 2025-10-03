export async function GET() {
  try {
    // Check environment variables
    const hasUrl = !!process.env.SUPABASE_URL;
    const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Environment check:');
    console.log('SUPABASE_URL exists:', hasUrl);
    console.log('SUPABASE_SERVICE_ROLE_KEY exists:', hasKey);
    
    if (!hasUrl || !hasKey) {
      return Response.json({
        error: 'Missing environment variables',
        SUPABASE_URL: hasUrl,
        SUPABASE_SERVICE_ROLE_KEY: hasKey
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: 'Environment variables are configured',
      SUPABASE_URL: hasUrl,
      SUPABASE_SERVICE_ROLE_KEY: hasKey,
      note: 'Check server logs for Supabase connection details'
    });

  } catch (error) {
    console.error('Test DB error:', error);
    return Response.json({
      error: 'Error in test endpoint',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
