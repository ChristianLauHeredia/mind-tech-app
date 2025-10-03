'use client';
import { useState, useEffect } from 'react';

interface Candidate {
  employee_id: string;
  name?: string;           // Nombre completo del empleado
  email?: string;          // Email del empleado
  seniority?: string;      // Seniority del empleado
  summary: string;
  score?: number;
  match_details?: {
    matched_skills?: string[];
    seniority_match?: boolean;
    role_match?: boolean;
  };
}

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
  candidates?: Candidate[];
}

interface RequestsResponse {
  items: Request[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false
  });

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('limit', pagination.limit.toString());
      params.append('offset', pagination.offset.toString());

      console.log('🔄 Fetching all requests...');
      const response = await fetch(`/api/requests?${params}`);
      const data: RequestsResponse = await response.json();
      console.log('📊 Received data:', data);
      setRequests(data.items);
      setPagination({
        total: data.total,
        limit: data.limit,
        offset: data.offset,
        hasMore: data.hasMore
      });
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text: string, maxLength: number = 120) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const getRoleIcon = (role: string) => {
    if (role.toLowerCase().includes('frontend')) return '🎨';
    if (role.toLowerCase().includes('backend')) return '⚙️';
    if (role.toLowerCase().includes('fullstack')) return '🔄';
    if (role.toLowerCase().includes('devops')) return '🐳';
    if (role.toLowerCase().includes('mobile')) return '📱';
    return '💼';
  };

  const loadMore = () => {
    if (pagination.hasMore) {
      setPagination(prev => ({
        ...prev,
        offset: prev.offset + prev.limit
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando solicitudes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Solicitudes</h1>
          <p className="text-gray-600 text-sm sm:text-base">Gestiona y revisa todas las solicitudes del sistema</p>
        </div>
        <button
          onClick={fetchRequests}
          className="btn btn-secondary text-sm"
        >
          Actualizar
        </button>
      </div>

      {/* Simplified header with counts */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Mostrando {requests?.length || 0} de {pagination.total} solicitudes
            </div>
            {pagination.hasMore && (
              <button
                onClick={loadMore}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Cargar más
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Lista de solicitudes */}
        <div className="xl:col-span-2">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Solicitudes ({requests?.length || 0})
                </h2>
                <div className="text-sm text-gray-500">
                  {pagination.total} total
                </div>
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {(requests?.length || 0) === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-sm font-medium text-gray-900">No hay solicitudes</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    No hay solicitudes registradas en el sistema
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {(requests || []).map((request) => (
                    <div
                      key={request.id}
                      className={`p-6 cursor-pointer transition-colors hover:bg-gray-50 ${
                        selectedRequest?.id === request.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''
                      }`}
                      onClick={() => setSelectedRequest(request)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center">
                          <span className="text-xs">
                            {getRoleIcon(request.parsed_skills?.role || request.role_hint || '')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-base font-medium text-gray-900 truncate">
                              {request.parsed_skills?.role || request.role_hint || 'Sin rol definido'}
                            </h3>
                            <span className={`badge ${
                              request.parsed_skills?.seniority === 'JR' ? 'badge-success' :
                              request.parsed_skills?.seniority === 'SSR' ? 'badge-primary' :
                              request.parsed_skills?.seniority === 'SR' ? 'badge-warning' :
                              'badge-gray'
                            }`}>
                              {request.parsed_skills?.seniority || request.seniority_hint || 'N/A'}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                            {truncateText(request.content)}
                          </p>
                          
                          {/* Candidatos encontrados */}
                          <div className="mb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-gray-700">Candidatos encontrados:</span>
                              <span className="badge badge-primary">{request.candidates?.length || 0}</span>
                            </div>
                            {request.candidates && request.candidates.length > 0 && (
                              <div className="space-y-2">
                                {request.candidates.slice(0, 3).map((candidate, index) => (
                                  <div key={candidate.employee_id} className="bg-gray-50 p-3 rounded">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-900">
                                          {candidate.name || `Empleado #${candidate.employee_id.slice(-4)}`}
                                        </span>
                                        {candidate.email && (
                                          <span className="text-xs text-gray-500">{candidate.email}</span>
                                        )}
                                        {candidate.seniority && (
                                          <span className="text-xs text-primary-600 font-medium">Seniority: {candidate.seniority}</span>
                                        )}
                                      </div>
                                      <span className={`badge ${
                                        (candidate.score || 0.5) >= 0.8 ? 'badge-success' :
                                        (candidate.score || 0.5) >= 0.6 ? 'badge-primary' :
                                        (candidate.score || 0.5) >= 0.4 ? 'badge-warning' :
                                        'badge-gray'
                                      }`}>
                                        {Math.round((candidate.score || 0.5) * 100)}%
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                      {candidate.summary}
                                    </p>
                                    {candidate.match_details?.matched_skills && candidate.match_details.matched_skills.length > 0 && (
                                      <div className="mt-2">
                                        <span className="text-xs text-gray-500">Skills matchadas:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {candidate.match_details.matched_skills.map(skill => (
                                            <span key={skill} className="badge badge-sm badge-gray text-xs">
                                              {skill}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {request.candidates.length > 3 && (
                                  <div className="text-xs text-gray-500 text-center">
                                    +{request.candidates.length - 3} candidatos más...
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {formatDate(request.created_at)}
                              </span>
                              {request.channel_id && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                  </svg>
                                  {request.channel_id}
                                </span>
                              )}
                            </div>
                            <a
                              href={`/requests/${request.id}`}
                              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Ver detalles
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel de detalles */}
        <div className="xl:col-span-1">
          <div className="card sticky top-6">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">Detalle de Solicitud</h2>
            </div>
            
            <div className="card-body">
              {selectedRequest ? (
                <div className="space-y-6">
                  {/* Información básica */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Información Básica</h3>
                    <div className="space-y-3">
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">ID</dt>
                        <dd className="text-sm text-gray-900 font-mono break-all">{selectedRequest.id}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Solicitante</dt>
                        <dd className="text-sm text-gray-900">{selectedRequest.requester}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Canal</dt>
                        <dd className="text-sm text-gray-900">{selectedRequest.channel_id || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha</dt>
                        <dd className="text-sm text-gray-900">{formatDate(selectedRequest.created_at)}</dd>
                      </div>
                    </div>
                  </div>

                  {/* Contenido original */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Contenido Original</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700 leading-relaxed">{selectedRequest.content}</p>
                    </div>
                  </div>

                  {/* Skills parseadas */}
                  {selectedRequest.parsed_skills && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Skills Parseadas</h3>
                      <div className="space-y-4">
                        <div>
                          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Rol</dt>
                          <dd className="text-sm font-medium text-gray-900">{selectedRequest.parsed_skills.role}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Seniority</dt>
                          <dd>
                            <span className={`badge ${
                              selectedRequest.parsed_skills.seniority === 'JR' ? 'badge-success' :
                              selectedRequest.parsed_skills.seniority === 'SSR' ? 'badge-primary' :
                              'badge-warning'
                            }`}>
                              {selectedRequest.parsed_skills.seniority}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Must Have</dt>
                          <dd className="flex flex-wrap gap-1">
                            {selectedRequest.parsed_skills.must_have && selectedRequest.parsed_skills.must_have.length > 0 ? (
                              selectedRequest.parsed_skills.must_have.map((skill, index) => (
                                <span key={index} className="badge badge-error">
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
                          <dd className="flex flex-wrap gap-1">
                            {selectedRequest.parsed_skills.nice_to_have && selectedRequest.parsed_skills.nice_to_have.length > 0 ? (
                              selectedRequest.parsed_skills.nice_to_have.map((skill, index) => (
                                <span key={index} className="badge badge-success">
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
                  )}

                  {/* Hints manuales */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Hints Manuales</h3>
                    <div className="space-y-2">
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Role Hint</dt>
                        <dd className="text-sm text-gray-900">{selectedRequest.role_hint || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Seniority Hint</dt>
                        <dd className="text-sm text-gray-900">{selectedRequest.seniority_hint || 'N/A'}</dd>
                      </div>
                    </div>
                  </div>

                  {/* Candidatos completos */}
                  {selectedRequest.candidates && selectedRequest.candidates.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-3">
                        Candidatos Encontrados ({selectedRequest.candidates.length})
                      </h3>
                      <div className="space-y-3">
                        {selectedRequest.candidates.map((candidate, index) => (
                          <div key={candidate.employee_id} className="bg-gray-50 rounded-lg p-4 border">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="text-lg font-semibold text-gray-900">
                                    {candidate.name || `Candidato ${index + 1}`}
                                  </span>
                                  <span className={`badge text-xs ${
                                    (candidate.score || 0.5) >= 0.8 ? 'badge-success' :
                                    (candidate.score || 0.5) >= 0.6 ? 'badge-primary' :
                                    (candidate.score || 0.5) >= 0.4 ? 'badge-warning' :
                                    'badge-gray'
                                  }`}>
                                    {Math.round((candidate.score || 0.5) * 100)}%
                                  </span>
                                </div>
                                {candidate.email && (
                                  <div className="text-sm text-gray-600 mb-1">
                                    📧 {candidate.email}
                                  </div>
                                )}
                                <div className="flex gap-4 text-xs text-gray-500">
                                  {candidate.seniority && (
                                    <span>👤 {candidate.seniority}</span>
                                  )}
                                  {candidate.location && (
                                    <span>📍 {candidate.location}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {candidate.summary && (
                              <div className="mb-3">
                                <div className="text-xs font-medium text-gray-700 mb-1">Resumen:</div>
                                <div className="text-sm text-gray-600 leading-relaxed">
                                  {candidate.summary}
                                </div>
                              </div>
                            )}
                            
                            {candidate.match_details?.matched_skills && candidate.match_details.matched_skills.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-gray-700 mb-2">Skills Matcheadas:</div>
                                <div className="flex flex-wrap gap-1">
                                  {candidate.match_details.matched_skills.map(skill => (
                                    <span key={skill} className="badge badge-sm badge-primary text-xs">
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <h3 className="text-sm font-medium text-gray-900">Selecciona una solicitud</h3>
                  <p className="text-sm text-gray-500 mt-1">Haz clic en una solicitud de la lista para ver los detalles</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}