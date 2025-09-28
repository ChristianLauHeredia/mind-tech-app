'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Request {
  id: string;
  requester: string;
  channel_id?: string;
  content: string;
  attachment_file_id?: string | null;
  parsed_skills?: {
    role?: string;
    seniority?: string;
    must_have?: string[];
    nice_to_have?: string[];
    extra_keywords?: string[];
  } | null;
  seniority_hint?: string;
  role_hint?: string;
  created_at: string;
}

export default function RequestDetailPage() {
  const params = useParams();
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<any[]>([]);
  const [matchingLoading, setMatchingLoading] = useState(false);

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const response = await fetch(`/api/requests/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setRequest(data);
          
          // También buscar matches si existen
          const matchesResponse = await fetch(`/api/requests/${params.id}/matches`);
          if (matchesResponse.ok) {
            const matchesData = await matchesResponse.json();
            setMatches(matchesData);
          }
        }
      } catch (error) {
        console.error('Error fetching request:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchRequest();
    }
  }, [params.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
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

  const handleMatching = async () => {
    if (!request) return;
    
    setMatchingLoading(true);
    try {
      const matchData = {
        role: request.parsed_skills?.role || request.role_hint,
        seniority: request.parsed_skills?.seniority || request.seniority_hint,
        must_have: request.parsed_skills?.must_have || [],
        nice_to_have: request.parsed_skills?.nice_to_have || [],
        withSummary: true
      };
      
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchData)
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`✅ Encontrados ${data.candidates.length} candidatos`);
      } else {
        alert('❌ Error ejecutando matching');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error ejecutando matching');
    } finally {
      setMatchingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando solicitud...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Solicitud no encontrada</h2>
          <p className="text-gray-600 mb-4">La solicitud que buscas no existe o fue eliminada</p>
          <a href="/requests" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a Solicitudes
          </a>
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
              <div className="flex items-center space-x-4">
                <a href="/requests" className="text-blue-600 hover:text-blue-800">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </a>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Detalle de Solicitud</h1>
                  <p className="mt-2 text-gray-600">Información completa y acciones disponibles</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigator.clipboard.writeText(request.id)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copiar ID
                </button>
                <button
                  onClick={handleMatching}
                  disabled={matchingLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {matchingLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Ejecutando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Ejecutar Matching
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header de la solicitud */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                  <span className="text-4xl">{getRoleIcon(request.parsed_skills?.role || request.role_hint || '')}</span>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {request.parsed_skills?.role || request.role_hint || 'Sin rol definido'}
                    </h2>
                    <div className="flex items-center space-x-3 mt-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSeniorityColor(request.parsed_skills?.seniority || request.seniority_hint || '')}`}>
                        {request.parsed_skills?.seniority || request.seniority_hint || 'N/A'}
                      </span>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-500">{request.requester}</span>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-500">{formatDate(request.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contenido original */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Contenido Original</h3>
              </div>
              <div className="p-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{request.content}</p>
                </div>
              </div>
            </div>

            {/* Skills parseadas */}
            {request.parsed_skills && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Skills Parseadas</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Información del Rol</h4>
                      <div className="space-y-3">
                        <div>
                          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rol Detectado</dt>
                          <dd className="text-sm font-medium text-gray-900 mt-1">{request.parsed_skills.role}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Seniority Detectado</dt>
                          <dd className="mt-1">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSeniorityColor(request.parsed_skills.seniority)}`}>
                              {request.parsed_skills.seniority}
                            </span>
                          </dd>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Skills Requeridas</h4>
                      <div className="space-y-4">
                        <div>
                          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Must Have</dt>
                          <dd className="flex flex-wrap gap-2">
                            {request.parsed_skills.must_have.length > 0 ? (
                              request.parsed_skills.must_have.map((skill, index) => (
                                <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-gray-500">Ninguna</span>
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Nice to Have</dt>
                          <dd className="flex flex-wrap gap-2">
                            {request.parsed_skills.nice_to_have.length > 0 ? (
                              request.parsed_skills.nice_to_have.map((skill, index) => (
                                <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-gray-500">Ninguna</span>
                            )}
                          </dd>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Hints manuales */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Hints Manuales</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Role Hint</dt>
                    <dd className="text-sm text-gray-900 mt-1">{request.role_hint || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Seniority Hint</dt>
                    <dd className="text-sm text-gray-900 mt-1">{request.seniority_hint || 'N/A'}</dd>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel lateral */}
          <div className="lg:col-span-1 space-y-6">
            {/* Información técnica */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Información Técnica</h3>
              </div>
              <div className="p-6">
                <dl className="space-y-4">
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">ID de Solicitud</dt>
                    <dd className="text-sm text-gray-900 font-mono break-all mt-1">{request.id}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Solicitante</dt>
                    <dd className="text-sm text-gray-900 mt-1">{request.requester}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Canal</dt>
                    <dd className="text-sm text-gray-900 mt-1">{request.channel_id || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha de Creación</dt>
                    <dd className="text-sm text-gray-900 mt-1">{formatDate(request.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Archivo Adjunto</dt>
                    <dd className="text-sm text-gray-900 mt-1">{request.attachment_file_id || 'N/A'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Matches encontrados */}
            {matches.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Matches Encontrados</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {matches.map((match, index) => (
                      <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-gray-900">{match.employee_name}</div>
                          <div className="text-sm font-medium text-blue-600">{match.score}</div>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">{match.position}</div>
                        <div className="text-xs text-gray-500">
                          {match.seniority} • {match.location || 'N/A'}
                        </div>
                        {match.summary && (
                          <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            {match.summary}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Acciones rápidas */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Acciones Rápidas</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <button
                    onClick={handleMatching}
                    disabled={matchingLoading}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {matchingLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Ejecutando Matching...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Ejecutar Matching
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => navigator.clipboard.writeText(request.id)}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copiar ID
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}