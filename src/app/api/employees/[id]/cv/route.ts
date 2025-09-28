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

    return Response.json(data);
  } catch (error) {
    console.error('Error in CV PUT endpoint:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await supabase
      .from('cvs')
      .delete()
      .eq('employee_id', params.id);

    if (error) {
      console.error('Error deleting CV:', error);
      return new Response('Error deleting CV', { status: 500 });
    }

    return new Response('CV deleted successfully', { status: 200 });
  } catch (error) {
    console.error('Error in CV DELETE endpoint:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
