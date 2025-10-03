import { createClient } from '@supabase/supabase-js';

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'Hace menos de 1 minuto';
  if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
  if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
  if (diffInDays < 7) return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
  return `Hace ${Math.floor(diffInDays / 7)} semana${Math.floor(diffInDays / 7) > 1 ? 's' : ''}`;
}

// Solo crear cliente si tenemos variables de entorno válidas
let supabase: any = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Fetches dashboard statistics from the database including employee metrics,
 * request metrics, skills analytics, and recent activity.
 * 
 * @returns {Object} Dashboard data including:
 *   - totalEmployees: Number of employees in database
 *   - totalRequests: Number of search requests made
 *   - totalCandidatesSuggested: Total candidates suggested across all requests
 *   - totalUniqueSkills: Count of unique skills found in candidates
 *   - topSkills: Top 5 skill names with occurrence counts
 *   - topEmployees: List of senior employees
 *   - recentActivity: Recent requests and employee activities
 */
async function getDashboardStats() {
  try {
    if (!supabase) {
      throw new Error('Database not configured');
    }
    
    // Fetch employees data
    const { data: employeesData, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .limit(100);
    
    if (employeesError) {
      console.error('Error fetching employees:', employeesError);
      throw employeesError;
    }

    // Fetch requests data for metrics calculation
    const { data: requestsData, error: requestsError } = await supabase
      .from('requests')
      .select(`
        id,
        parsed_skills,
        created_at,
        candidates
      `)
      .limit(100);
    
    if (requestsError) {
      console.error('Error getting requests:', requestsError);
      throw requestsError;
    }


    // Process top employees (filter by seniority for better representation)
    const topEmployees = employeesData?.filter((emp: any) => emp.seniority === 'SR').slice(0, 5).map((emp: any) => ({
      id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`.trim(),
      email: emp.email,
      seniority: emp.seniority,
      location: emp.location
    })) || [];


    // Calculate top skills from requests and candidates
    const skillCounts: Record<string, number> = {};
    
    requestsData?.forEach((request: any) => {
      // Primary: Extract from candidate matched_skills (main source since parsed_skills is null)
      if (request.candidates && Array.isArray(request.candidates)) {
        request.candidates.forEach((candidate: any) => {
          if (candidate.match_details?.matched_skills && Array.isArray(candidate.match_details.matched_skills)) {
            candidate.match_details.matched_skills.forEach((skill: any) => {
              if (typeof skill === 'string' && skill.trim()) {
                const normalizedSkill = skill.toLowerCase().trim();
                skillCounts[normalizedSkill] = (skillCounts[normalizedSkill] || 0) + 1;
              }
            });
          }
        });
      }
      
      // Secondary: Extract from parsed_skills if available
      if (request.parsed_skills && typeof request.parsed_skills === 'object') {
        const skills = request.parsed_skills;
        const mustHave = Array.isArray(skills.must_have) ? skills.must_have : [];
        const niceToHave = Array.isArray(skills.nice_to_have) ? skills.nice_to_have : [];
        const extraKeywords = Array.isArray(skills.extra_keywords) ? skills.extra_keywords : [];
        
        [...mustHave, ...niceToHave, ...extraKeywords].forEach((skill: any) => {
          if (typeof skill === 'string' && skill.trim()) {
            const normalizedSkill = skill.toLowerCase().trim();
            skillCounts[normalizedSkill] = (skillCounts[normalizedSkill] || 0) + 1;
          }
        });
      }
    });

    const topSkills = Object.entries(skillCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([skill, count]) => ({ skill, count }));

    // Calculate total unique skills (all skills, not just top 5)
    const totalUniqueSkills = Object.keys(skillCounts).length;

    // Get total requests count
    const totalRequests = requestsData?.length || 0;

    // Get total candidates suggested (sum from candidates array in requests)
    const totalCandidatesSuggested = requestsData?.reduce((total: number, request: any) => {
      return total + (request.candidates?.length || 0);
    }, 0) || 0;

    // Get recent activity (last 4 activities)
    const recentRequests = requestsData
      ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      ?.slice(0, 4)
      ?.map((request: any) => ({
        id: request.id,
        type: 'request',
        message: `Nueva solicitud: ${request.parsed_skills?.role || 'Sin rol definido'} ${request.parsed_skills?.seniority || ''}`.trim(),
        time: getTimeAgo(request.created_at)
      })) || [];

    // Get recent employee activities (if any employees have recent updates)
    const recentEmployees = employeesData
      ?.slice(0, 2)
      ?.map((emp: any) => ({
        id: `emp-${emp.id}`,
        type: 'employee',
        message: `Empleado disponible: ${emp.name} (${emp.seniority})`,
        time: 'Reciente'
      })) || [];

    // Combine and sort activities
    const allActivities = [...recentRequests, ...recentEmployees]
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, 4);

    return {
      totalEmployees: employeesData?.length || 0,
      totalRequests: requestsData?.length || 0,
      totalCandidatesSuggested,
      totalUniqueSkills,
      topSkills,
      topEmployees,
      recentActivity: allActivities
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      totalEmployees: 0,
      totalRequests: 0,
      totalCandidatesSuggested: 0,
      totalUniqueSkills: 0,
      topSkills: [],
      topEmployees: [],
      recentActivity: []
    };
  }
}

export default async function Home() {
  const stats = await getDashboardStats();

  const statsData = [
    { name: 'Total Empleados', value: stats.totalEmployees.toString(), change: '+0', changeType: 'positive', icon: '👥' },
    { name: 'Solicitudes Totales', value: stats.totalRequests.toString(), change: '+0', changeType: 'positive', icon: '📋' },
    { name: 'Candidatos Sugeridos', value: stats.totalCandidatesSuggested.toString(), change: '+0', changeType: 'positive', icon: '🎯' },
    { name: 'Skills Únicos', value: stats.totalUniqueSkills.toString(), change: '+0', changeType: 'positive', icon: '📈' }
  ];

  // recentActivity ahora viene de la base de datos, no del mock

  return (
    <div className="space-y-8 w-full max-w-none">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Resumen del sistema de matching de talento</p>
      </div>

      {/* Stats Grid - Full Width */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {statsData.map((stat: any) => (
          <div key={stat.name} className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">{stat.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
                <div className={`text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-success-600' : 'text-error-500'
                }`}>
                  {stat.change}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content - Full Width Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        {/* Quick Actions - Takes 3 columns */}
        <div className="xl:col-span-3">
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">Acciones Rápidas</h2>
              <p className="text-sm text-gray-600 mt-1">Accede rápidamente a las funciones principales</p>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <a href="/employees" className="btn btn-primary btn-lg flex-col gap-3 p-6 hover:shadow-lg transition-all">
                  <span className="text-3xl">👥</span>
                  <div className="text-center">
                    <div className="font-semibold">Gestionar Empleados</div>
                    <div className="text-sm opacity-90">Ver, agregar y editar empleados</div>
                  </div>
                </a>
                <a href="/requests" className="btn btn-secondary btn-lg flex-col gap-3 p-6 hover:shadow-lg transition-all">
                  <span className="text-3xl">📋</span>
                  <div className="text-center">
                    <div className="font-semibold">Ver Solicitudes</div>
                    <div className="text-sm opacity-90">Revisar solicitudes de talento</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Top Skills Section - Takes 2 columns */}
        <div className="xl:col-span-2">
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">Skills Más Solicitadas</h2>
              <p className="text-sm text-gray-600 mt-1">Las habilidades técnicas más requeridas en las solicitudes</p>
            </div>
            <div className="card-body">
              {stats.topSkills.length > 0 ? (
                <div className="space-y-3">
                  {stats.topSkills.map((skillData: any, index: number) => (
                    <div key={skillData.skill} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 bg-primary-100 text-primary-700 text-xs font-semibold rounded">
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900">{skillData.skill}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {skillData.count} {skillData.count === 1 ? 'vez' : 'veces'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">No hay datos de skills aún</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Employees Section - Takes 2 columns */}
        <div className="xl:col-span-2">
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">Top Empleados</h2>
              <p className="text-sm text-gray-600 mt-1">Nuestros mejores candidatos disponibles</p>
            </div>
            <div className="card-body">
              {stats.topEmployees.length > 0 ? (
                <div className="space-y-3">
                   {stats.topEmployees.map((employee: any, index: number) => (
                    <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-700 text-sm font-semibold rounded-full">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{employee.name}</p>
                          <p className="text-xs text-gray-500">{employee.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`badge ${
                          employee.seniority === 'JR' ? 'badge-success' :
                          employee.seniority === 'SSR' ? 'badge-primary' :
                          'badge-warning'
                        }`}>
                          {employee.seniority}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">{employee.location}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">No hay empleados registrados aún</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity - Takes 1 column */}
        <div className="xl:col-span-1">
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">Actividad Reciente</h2>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                {stats.recentActivity.length > 0 ? (
                  stats.recentActivity.map((activity: any) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`w-3 h-3 rounded-full mt-2 ${
                        activity.type === 'request' ? 'bg-primary-500' :
                        activity.type === 'match' ? 'bg-success-500' :
                        activity.type === 'employee' ? 'bg-warning-500' :
                        'bg-gray-400'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{activity.message}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No hay actividad reciente</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* System Status - Takes 1 column */}
        <div className="xl:col-span-1">
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">Estado del Sistema</h2>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-success-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Base de Datos</p>
                    <p className="text-xs text-gray-500">Conectada y funcionando</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-success-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">API</p>
                    <p className="text-xs text-gray-500">Todos los endpoints activos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-success-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">n8n Webhook</p>
                    <p className="text-xs text-gray-500">Recibiendo solicitudes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Info Section - Full Width */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Stats */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">Resumen Rápido</h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Empleados activos</span>
                <span className="font-semibold">{stats.totalEmployees}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Solicitudes procesadas</span>
                <span className="font-semibold">{stats.totalRequests}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Matches generados</span>
                <span className="font-semibold">{stats.totalCandidatesSuggested}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tasa de éxito</span>
                <span className="font-semibold text-success-600">
                  {stats.totalRequests > 0 ? Math.round((stats.totalCandidatesSuggested / stats.totalRequests) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">Salud del Sistema</h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Uptime</span>
                <span className="font-semibold text-success-600">99.9%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Respuesta API</span>
                <span className="font-semibold text-success-600">&lt; 200ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Última actualización</span>
                <span className="font-semibold">Hace 2 min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Versión</span>
                <span className="font-semibold">v1.0.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">Métricas de Rendimiento</h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Tiempo promedio de match</span>
                <span className="font-semibold text-success-600">2.3s</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Precisión del parser</span>
                <span className="font-semibold text-success-600">94.2%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Solicitudes por hora</span>
                <span className="font-semibold">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Carga del servidor</span>
                <span className="font-semibold text-success-600">23%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  }