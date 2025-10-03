import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabase
      .from('cvs')
      .select('*')
      .eq('employee_id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No CV found for this employee
        return new Response('CV not found', { status: 404 });
      }
      console.error('Error fetching CV:', error);
      return new Response('Error fetching CV', { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    console.error('Error in CV endpoint:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url) {
      return new Response('url is required', { status: 400 });
    }

    const { data, error } = await supabase
      .from('cvs')
      .upsert({
        employee_id: params.id,
        url,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating CV:', error);
      return new Response('Error updating CV', { status: 500 });
    }

    // 🤖 AUTO-AGENT-CV: Trigger n8n agent to extract CV data
    let indexResult = null;
    try {
      console.log(`🤖 Calling n8n agent to extract CV for employee ${params.id}`);
      
      // Call n8n agent to extract CV data
      const agentResponse = await fetch('https://laucho.app.n8n.cloud/webhook/index-cv', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          employee_id: params.id,
          cv_url: url,
          action: 'extract_cv_data'
        })
      });

      if (agentResponse.ok) {
        const agentResult = await agentResponse.json();
        console.log(`✅ Agent extraction successful for employee ${params.id}`);
        
        // Store the extracted CV data in cv_index
        const cvIndexResponse = await fetch(`${req.nextUrl.origin}/api/cv-index-simple`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || ''
          },
          body: JSON.stringify({ 
            employee_id: params.id,
            cv_data: JSON.stringify(agentResult.cv_data)
          })
        });

        if (cvIndexResponse.ok) {
          indexResult = await cvIndexResponse.json();
          console.log(`✅ CV data stored successfully for employee ${params.id}`);
        } else {
          console.log(`⚠️ Failed to store CV data for employee ${params.id}`);
          indexResult = { error: 'Failed to store extracted CV data' };
        }
      } else {
        console.log(`⚠️ Agent extraction failed for employee ${params.id}:`, agentResponse.statusText);
        indexResult = { error: 'Agent extraction failed' };
      }
    } catch (indexError) {
      console.error('Agent CV extraction error:', indexError);
      indexResult = { error: 'Agent CV extraction failed' };
    }

    console.log(`✅ CV uploaded successfully for employee ${params.id}`);
    
    return Response.json({
      ...data,
      message: 'CV uploaded successfully and processed by agent.',
      agent_extraction_result: indexResult
    });
  } catch (error) {
    console.error('Error in CV PUT endpoint:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Delete CV record
    const { error: cvError } = await supabase
      .from('cvs')
      .delete()
      .eq('employee_id', params.id);

    if (cvError) {
      console.error('Error deleting CV:', cvError);
      return new Response('Error deleting CV', { status: 500 });
    }

    // Also delete CV index if it exists
    const { error: indexError } = await supabase
      .from('cv_index')
      .delete()
      .eq('employee_id', params.id);

    if (indexError) {
      console.error('Error deleting CV index:', indexError);
      // Continue anyway, CV was already deleted
    }

    return new Response('CV and index deleted successfully', { status: 200 });
  } catch (error) {
    console.error('Error in CV DELETE endpoint:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
