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
    
    // 1. Parse the text
    const parsedData = parseText(text);
    
    // 2. Find matches - TODO: Esta funcionalidad ahora la maneja un agente externo
    // const matchResponse = await fetch(`${req.nextUrl.origin}/api/match`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     role: parsedData.role,
    //     seniority: parsedData.seniority,
    //     must_have: parsedData.must_have,
    //     nice_to_have: parsedData.nice_to_have,
    //     withSummary: false
    //   })
    // });
    
    // const matchData = await matchResponse.json();
    const matchData = { candidates: [] };
    
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
      message: `Found ${matchData.candidates.length} candidates for ${parsedData.role} (${parsedData.seniority})`,
      summary: `Parsed: ${parsedData.role} (${parsedData.seniority}) with must-have: ${parsedData.must_have.join(', ')} and nice-to-have: ${parsedData.nice_to_have.join(', ')}`
    });
    
  } catch (error) {
    console.error('Webhook simulation error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text');
    
    if (!text) {
      return new Response('Text parameter is required', { status: 400 });
    }
    
    // 1. Parse the text
    const parsedData = parseText(text);
    
    // 2. Find matches - TODO: Esta funcionalidad ahora la maneja un agente externo
    // const matchResponse = await fetch(`${req.nextUrl.origin}/api/match`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     role: parsedData.role,
    //     seniority: parsedData.seniority,
    //     must_have: parsedData.must_have,
    //     nice_to_have: parsedData.nice_to_have,
    //     withSummary: false
    //   })
    // });
    
    // const matchData = await matchResponse.json();
    const matchData = { candidates: [] };
    
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
      message: `Found ${matchData.candidates.length} candidates for ${parsedData.role} (${parsedData.seniority})`,
      summary: `Parsed: ${parsedData.role} (${parsedData.seniority}) with must-have: ${parsedData.must_have.join(', ')} and nice-to-have: ${parsedData.nice_to_have.join(', ')}`
    });
    
  } catch (error) {
    console.error('Webhook simulation error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
