import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await sb
    .from('employees')
    .select('*')
    .eq('id', params.id)
    .single();
    
  if (error) return new Response(error.message, { status: 404 });
  return Response.json(data);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  
  const { data, error } = await sb
    .from('employees')
    .update(body)
    .eq('id', params.id)
    .select('*');
    
  if (error) return new Response(error.message, { status: 400 });

  // 🔄 AUTO-AGENT-CV: If employee has CV, trigger n8n agent to extract CV
  let indexResult = null;
  try {
    // Check if employee has CV
    const { data: cvData } = await sb
      .from('cvs')
      .select('url')
      .eq('employee_id', params.id)
      .single();

    if (cvData?.url) {
      console.log(`🤖 Calling n8n agent to extract CV for employee ${params.id}`);
      
      // Call n8n agent to extract CV data
      const agentResponse = await fetch('https://laucho.app.n8n.cloud/webhook/index-cv', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          employee_id: params.id,
          cv_url: cvData.url,
          action: 'extract_cv_data'
        })
      });

      if (agentResponse.ok) {
        const agentResult = await agentResponse.json();
        console.log(`✅ Agent extraction successful for employee ${params.id}`);
        
        // n8n will handle the CV indexing automatically
        console.log(`✅ CV sent to n8n for processing. Indexing will complete automatically for employee ${params.id}`);
        indexResult = { message: 'CV sent to n8n for automatic processing' };
          
      } else {
        console.log(`⚠️ Agent extraction failed for employee ${params.id}:`, agentResponse.statusText);
        indexResult = { error: 'Agent extraction failed' };
      }
    }
  } catch (indexError) {
    console.error('Agent CV extraction error:', indexError);
    indexResult = { error: 'Agent CV extraction failed' };
  }

  return Response.json({
    ...data?.[0],
    message: 'Employee updated successfully',
    cv_processed_by_agent: indexResult ? true : false,
    agent_extraction_result: indexResult
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await sb
    .from('employees')
    .delete()
    .eq('id', params.id);
    
  if (error) return new Response(error.message, { status: 400 });
  return new Response('Employee deleted successfully', { status: 200 });
}
