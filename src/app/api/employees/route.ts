import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Solo crear cliente si tenemos variables de entorno válidas
let sb: any = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function GET() {
  try {
    if (!sb) {
      return Response.json({ error: 'Database not configured' }, { status: 503 });
    }
    const { data, error } = await sb.from('employees').select('*').limit(100);
    
    if (error) {
      console.error('Database error:', error);
      return Response.json({ error: 'Database query failed' }, { status: 500 });
    }
    
    return Response.json(data || []);
  } catch (error) {
    console.error('Request error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!sb) {
      return Response.json({ error: 'Database not configured' }, { status: 503 });
    }
    const body = await req.json();
    const { data, error } = await sb.from('employees').insert(body).select('*');
    
    if (error) {
      console.error('Database error:', error);
      return Response.json({ error: 'Database operation failed' }, { status: 500 });
    }
    
    return Response.json(data?.[0]);
  } catch (error) {
    console.error('Request error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return Response.json({ error: 'ID is required for update' }, { status: 400 });
    }
    
    const { data, error } = await sb
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select('*');
      
    if (error) {
      console.error('Database error:', error);
      return Response.json({ error: 'Database update failed' }, { status: 500 });
    }
    
    return Response.json(data?.[0]);
  } catch (error) {
    console.error('Request error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return Response.json({ error: 'ID is required for deletion' }, { status: 400 });
    }
    
    const { error } = await sb
      .from('employees')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Database error:', error);
      return Response.json({ error: 'Database deletion failed' }, { status: 500 });
    }
    
    return Response.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Request error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
