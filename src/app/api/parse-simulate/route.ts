import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body;
    
    if (!text) {
      return new Response('Text is required', { status: 400 });
    }
    
    // Simple parsing simulation
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
    
    const parsedData = {
      role,
      seniority,
      must_have: mustHave,
      nice_to_have: niceToHave,
      extra_keywords: []
    };
    
    // Return parsed data
    return Response.json({
      success: true,
      parsed: parsedData,
      message: `Parsed: ${role} (${seniority}) with skills: ${mustHave.join(', ')}`,
      next_step: 'Use /api/match endpoint with the parsed data'
    });
    
  } catch (error) {
    console.error('Parse simulation error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
