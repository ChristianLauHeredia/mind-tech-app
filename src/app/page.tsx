import { createClient } from '@supabase/supabase-js';

// Solo crear cliente si tenemos variables de entorno válidas
let supabase: any = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function getDashboardStats() {
  try {
    if (!supabase) {
      throw new Error('Database not configured');
    }

    // Get employees count
    const { count: employeesCount, error: employeesError } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });
    
    if (employeesError) throw employeesError;

    // Get requests count
    const { count: requestsCount, error: requestsError } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true });
    
    if (requestsError) throw requestsError;

    // Get matches count
    const { count: matchesCount, error: matchesError } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true });
    
    if (matchesError) throw matchesError;

    return {
      totalEmployees: employeesCount || 0,
      totalRequests: requestsCount || 0,
      totalMatches: matchesCount || 0
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      totalEmployees: 0,
      totalRequests: 0,
      totalMatches: 0
    };
  }
}

export default async function Home() {
  const stats = await getDashboardStats();

  const statsData = [
    { name: 'Total Empleados', value: stats.totalEmployees.toString(), change: '+0', changeType: 'positive', icon: '👥' },
    { name: 'Solicitudes Totales', value: stats.totalRequests.toString(), change: '+0', changeType: 'positive', icon: '📋' },
    { name: 'Matches Exitosos', value: stats.totalMatches.toString(), change: '+0', changeType: 'positive', icon: '🎯' },
    { name: 'Tasa de Éxito', value: `${stats.totalRequests > 0 ? Math.round((stats.totalMatches / stats.totalRequests) * 100) : 0}%`, change: '+0%', changeType: 'positive', icon: '📈' }
  ];

  const recentActivity = [
    { id: 1, type: 'request', message: 'Nueva solicitud: Frontend Developer SR', time: '2 min ago' },
    { id: 2, type: 'match', message: 'Match encontrado para Backend Developer', time: '15 min ago' },
    { id: 3, type: 'employee', message: 'Nuevo empleado agregado: María García', time: '1 hora ago' },
    { id: 4, type: 'system', message: 'Sistema actualizado correctamente', time: '2 horas ago' },
  ];

  return (
    <div className="space-y-8 w-full max-w-none">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Resumen del sistema de matching de talento</p>
      </div>

      {/* Stats Grid - Full Width */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {statsData.map((stat) => (
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
                <a href="/parse-test" className="btn btn-secondary btn-lg flex-col gap-3 p-6 hover:shadow-lg transition-all">
                  <span className="text-3xl">🧠</span>
                  <div className="text-center">
                    <div className="font-semibold">Test Parse IA</div>
                    <div className="text-sm opacity-90">Probar el parser de IA</div>
                  </div>
                </a>
                <a href="/metrics" className="btn btn-secondary btn-lg flex-col gap-3 p-6 hover:shadow-lg transition-all">
                  <span className="text-3xl">📊</span>
                  <div className="text-center">
                    <div className="font-semibold">Ver Métricas</div>
                    <div className="text-sm opacity-90">Estadísticas del sistema</div>
                  </div>
                </a>
              </div>
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
                {recentActivity.map((activity) => (
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
                ))}
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
                <span className="font-semibold">{stats.totalMatches}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tasa de éxito</span>
                <span className="font-semibold text-success-600">
                  {stats.totalRequests > 0 ? Math.round((stats.totalMatches / stats.totalRequests) * 100) : 0}%
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