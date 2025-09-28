'use client';
import { useState, useEffect } from 'react';

interface RequestStats {
  total_requests: number;
  requests_by_role: { role: string; count: number }[];
  requests_by_seniority: { seniority: string; count: number }[];
  requests_by_channel: { channel: string; count: number }[];
  recent_requests: any[];
}

export default function MetricsPage() {
  const [stats, setStats] = useState<RequestStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/requests/stats');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleIcon = (role: string) => {
    if (role.toLowerCase().includes('frontend')) return '🎨';
    if (role.toLowerCase().includes('backend')) return '⚙️';
    if (role.toLowerCase().includes('fullstack')) return '🔄';
    if (role.toLowerCase().includes('devops')) return '🐳';
    if (role.toLowerCase().includes('mobile')) return '📱';
    return '💼';
  };

  const getSeniorityColor = (seniority: string) => {
    switch (seniority) {
      case 'JR': return 'bg-green-100 text-green-800';
      case 'SSR': return 'bg-blue-100 text-blue-800';
      case 'SR': return 'bg-purple-100 text-purple-800';
      case 'STAFF': return 'bg-orange-100 text-orange-800';
      case 'PRINC': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChannelIcon = (channel: string) => {
    if (channel.toLowerCase().includes('teams')) return '💬';
    if (channel.toLowerCase().includes('slack')) return '💬';
    if (channel.toLowerCase().includes('webhook')) return '🔗';
    return '📡';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error cargando métricas</h2>
          <p className="text-gray-600">No se pudieron cargar las estadísticas del sistema</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Métricas de Solicitudes</h1>
                <p className="mt-2 text-gray-600">Análisis y estadísticas del sistema de matching</p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Actualizar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cards principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total de solicitudes */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Solicitudes</p>
                <p className="text-3xl font-bold">{stats.total_requests}</p>
              </div>
              <div className="text-blue-200">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Roles únicos */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Roles Únicos</p>
                <p className="text-3xl font-bold">{stats.requests_by_role.length}</p>
              </div>
              <div className="text-green-200">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                </svg>
              </div>
            </div>
          </div>

          {/* Seniorities únicos */}
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Niveles Únicos</p>
                <p className="text-3xl font-bold">{stats.requests_by_seniority.length}</p>
              </div>
              <div className="text-purple-200">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Canales únicos */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Canales Únicos</p>
                <p className="text-3xl font-bold">{stats.requests_by_channel.length}</p>
              </div>
              <div className="text-orange-200">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Solicitudes por rol */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="mr-2">🎯</span>
                Solicitudes por Rol
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {stats.requests_by_role.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getRoleIcon(item.role || '')}</span>
                      <div>
                        <div className="font-medium text-gray-900">{item.role || 'Sin rol'}</div>
                        <div className="text-sm text-gray-500">{item.count} solicitudes</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{item.count}</div>
                      <div className="text-xs text-gray-500">
                        {Math.round((item.count / stats.total_requests) * 100)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Solicitudes por seniority */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="mr-2">📊</span>
                Solicitudes por Seniority
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {stats.requests_by_seniority.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSeniorityColor(item.seniority || '')}`}>
                        {item.seniority || 'Sin seniority'}
                      </span>
                      <div className="text-sm text-gray-500">{item.count} solicitudes</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{item.count}</div>
                      <div className="text-xs text-gray-500">
                        {Math.round((item.count / stats.total_requests) * 100)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Solicitudes por canal */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="mr-2">📡</span>
              Solicitudes por Canal
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.requests_by_channel.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getChannelIcon(item.channel || '')}</span>
                    <div>
                      <div className="font-medium text-gray-900">{item.channel || 'Sin canal'}</div>
                      <div className="text-sm text-gray-500">{item.count} solicitudes</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900">{item.count}</div>
                    <div className="text-xs text-gray-500">
                      {Math.round((item.count / stats.total_requests) * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Solicitudes recientes */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="mr-2">⏰</span>
              Solicitudes Recientes
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats.recent_requests.map((request, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl">{getRoleIcon(request.parsed_skills?.role || request.role_hint || '')}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {request.parsed_skills?.role || request.role_hint || 'Sin rol'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {request.requester} • {formatDate(request.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeniorityColor(request.parsed_skills?.seniority || request.seniority_hint || '')}`}>
                      {request.parsed_skills?.seniority || request.seniority_hint || 'N/A'}
                    </span>
                    <a
                      href={`/requests/${request.id}`}
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Ver detalles
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
