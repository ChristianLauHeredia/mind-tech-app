import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

interface CVIndexRequest {
  employee_id: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: CVIndexRequest = await req.json();
    const { employee_id } = body;

    if (!employee_id) {
      return Response.json({ error: 'employee_id is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ 
        error: 'OpenAI API key is required for PDF extraction' 
      }, { status: 400 });
    }

    // Get CV URL from database
    const { data: cvData, error: cvError } = await supabase
      .from('cvs')
      .select('url')
      .eq('employee_id', employee_id)
      .single();

    if (cvError || !cvData) {
      return Response.json({ error: 'CV not found for employee' }, { status: 404 });
    }

    console.log(`📋 Indexing CV for employee ${employee_id}`);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // For now, return info about the CV URL
    // TODO: Implement actual PDF extraction
    const plain_text = `CV URL: ${cvData.url}
Employee ID: ${employee_id}
Status: Ready for PDF extraction
Timestamp: ${new Date().toISOString()}`;

    // Mock skills extraction for now
    const parsed_skills = {
      skills: ['react', 'javascript', 'typescript', 'nodejs', 'express', 'mongodb', 'docker', 'aws']
    };

    // Store CV index in database (simplified version without parsed_skills)
    const { data: indexData, error: indexError } = await supabase
      .from('cv_index')
      .upsert({
        employee_id,
        plain_text,
        last_indexed_at: new Date().toISOString()
      })
      .select()
      .single();

    return Response.json({
      ...indexData,
      message: 'CV indexed successfully (ready for real extraction)',
      url_indexed: cvData.url,
      extracted_skills: parsed_skills.skills,
      note: 'This is a placeholder - real PDF extraction needs to be implemented'
    });

  } catch (error) {
    console.error('CV index error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}