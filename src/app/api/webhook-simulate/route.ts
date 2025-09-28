import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Simulated parsing function (since OpenAI API key is demo)
function simulateParsing(text: string) {
  // Simple keyword extraction
  const lowerText = text.toLowerCase();
  
  let role = 'Developer';
  let seniority = 'SR';
  const mustHave: string[] = [];
  const niceToHave: string[] = [];
  
  // Extract seniority
  if (lowerText.includes('jr')) seniority = 'JR';
  else if (lowerText.includes('ssr')) seniority = 'SSR';
  else if (lowerText.includes('sr')) seniority = 'SR';
  else if (lowerText.includes('staff')) seniority = 'STAFF';
  else if (lowerText.includes('princ')) seniority = 'PRINC';
  
  // Extract role
  if (lowerText.includes('frontend')) role = 'Frontend Developer';
  else if (lowerText.includes('backend')) role = 'Backend Developer';
  else if (lowerText.includes('fullstack')) role = 'Fullstack Developer';
  else if (lowerText.includes('devops')) role = 'DevOps Engineer';
  
  // Extract skills
  const skills = ['react', 'typescript', 'javascript', 'node.js', 'next.js', 'vue', 'angular', 'python', 'java', 'postgres', 'mysql', 'mongodb', 'docker', 'kubernetes', 'aws', 'azure', 'tailwind', 'css', 'html'];
  
  skills.forEach(skill => {
    if (lowerText.includes(skill)) {
      if (lowerText.includes('deseable') || lowerText.includes('nice') || lowerText.includes('opcional')) {
        niceToHave.push(skill);
      } else {
        mustHave.push(skill);
      }
    }
  });
  
  return {
    role,
    seniority,
    must_have: mustHave,
    nice_to_have: niceToHave,
    extra_keywords: []
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body;
    
    if (!text) {
      return new Response('Text is required', { status: 400 });
    }
    
    // 1. Parse the text
    const parsedData = simulateParsing(text);
    
    // 2. Find matches
    const matchResponse = await fetch(`${req.nextUrl.origin}/api/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: parsedData.role,
        seniority: parsedData.seniority,
        must_have: parsedData.must_have,
        nice_to_have: parsedData.nice_to_have,
        withSummary: false
      })
    });
    
    const matchData = await matchResponse.json();
    
    // 3. Save request
    const requestData = {
      requester: 'n8n-webhook@company.com',
      channel_id: 'n8n-webhook',
      content: text,
      parsed_skills: parsedData,
      seniority_hint: parsedData.seniority,
      role_hint: parsedData.role
    };
    
    const { data: savedRequest } = await sb
      .from('requests')
      .insert(requestData)
      .select('*')
      .single();
    
    // 4. Return response
    return Response.json({
      success: true,
      parsed: parsedData,
      candidates: matchData.candidates,
      request_id: savedRequest?.id,
      message: `Found ${matchData.candidates.length} candidates for ${parsedData.role} (${parsedData.seniority})`
    });
    
  } catch (error) {
    console.error('Webhook simulation error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
