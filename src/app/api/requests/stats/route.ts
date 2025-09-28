import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET() {
  try {
    // Obtener todas las solicitudes
    const { data: requests, error } = await sb
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      return new Response(error.message, { status: 500 });
    }

    // Calcular estadísticas
    const total_requests = requests.length;
    
    // Agrupar por rol
    const roleMap = new Map<string, number>();
    requests.forEach(req => {
      const role = req.parsed_skills?.role || req.role_hint || 'Sin rol';
      roleMap.set(role, (roleMap.get(role) || 0) + 1);
    });
    const requests_by_role = Array.from(roleMap.entries()).map(([role, count]) => ({ role, count }));
    
    // Agrupar por seniority
    const seniorityMap = new Map<string, number>();
    requests.forEach(req => {
      const seniority = req.parsed_skills?.seniority || req.seniority_hint || 'Sin seniority';
      seniorityMap.set(seniority, (seniorityMap.get(seniority) || 0) + 1);
    });
    const requests_by_seniority = Array.from(seniorityMap.entries()).map(([seniority, count]) => ({ seniority, count }));
    
    // Agrupar por canal
    const channelMap = new Map<string, number>();
    requests.forEach(req => {
      const channel = req.channel_id || 'Sin canal';
      channelMap.set(channel, (channelMap.get(channel) || 0) + 1);
    });
    const requests_by_channel = Array.from(channelMap.entries()).map(([channel, count]) => ({ channel, count }));
    
    // Solicitudes recientes (últimas 10)
    const recent_requests = requests.slice(0, 10);
    
    const stats = {
      total_requests,
      requests_by_role,
      requests_by_seniority,
      requests_by_channel,
      recent_requests
    };
    
    return Response.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
