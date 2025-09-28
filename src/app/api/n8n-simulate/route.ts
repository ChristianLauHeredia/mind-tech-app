import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Simple parsing function
function parseText(text: string) {
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
  
  // Split text by "deseable" to separate must-have from nice-to-have
  const parts = lowerText.split(/deseable|nice|opcional/);
  const mustHavePart = parts[0];
  const niceToHavePart = parts[1] || '';
  
  skills.forEach(skill => {
    if (mustHavePart.includes(skill)) {
      mustHave.push(skill);
    }
    if (niceToHavePart.includes(skill)) {
      niceToHave.push(skill);
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
    
    console.log('Processing text:', text);
    
    // 1. Parse the text
    const parsedData = parseText(text);
    console.log('Parsed data:', parsedData);
    
    // 2. Find matches
    const matchResponse = await fetch(`${req.nextUrl.origin}/api/match`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from('admin:password123').toString('base64')
      },
      body: JSON.stringify({
        role: parsedData.role,
        seniority: parsedData.seniority,
        must_have: parsedData.must_have,
        nice_to_have: parsedData.nice_to_have,
        withSummary: false
      })
    });
    
    if (!matchResponse.ok) {
      throw new Error(`Match API error: ${matchResponse.status}`);
    }
    
    const matchData = await matchResponse.json();
    console.log('Match data:', matchData);
    
    // 3. Save request
    const requestData = {
      requester: 'n8n-webhook@company.com',
      channel_id: 'n8n-webhook',
      content: text,
      parsed_skills: parsedData,
      seniority_hint: parsedData.seniority,
      role_hint: parsedData.role
    };
    
    const { data: savedRequest, error: saveError } = await sb
      .from('requests')
      .insert(requestData)
      .select('*')
      .single();
    
    if (saveError) {
      console.error('Save error:', saveError);
      throw new Error(`Save error: ${saveError.message}`);
    }
    
    console.log('Saved request:', savedRequest);
    
    // 4. Return response
    const response = {
      success: true,
      parsed: parsedData,
      candidates: matchData.candidates,
      request_id: savedRequest?.id,
      message: `Found ${matchData.candidates.length} candidates for ${parsedData.role} (${parsedData.seniority})`,
      summary: `Parsed: ${parsedData.role} (${parsedData.seniority}) with must-have: ${parsedData.must_have.join(', ')} and nice-to-have: ${parsedData.nice_to_have.join(', ')}`
    };
    
    console.log('Final response:', response);
    return Response.json(response);
    
  } catch (error) {
    console.error('Webhook simulation error:', error);
    return new Response(`Internal server error: ${error}`, { status: 500 });
  }
}
