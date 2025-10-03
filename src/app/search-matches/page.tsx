'use client';

import { useState } from 'react';

interface Candidate {
  employee_id: string;
  name?: string;
  email?: string;
  seniority?: string;
  location?: string;
  summary?: string; // Individual summary from n8n
  score?: number;
  match_details?: {
    matched_skills?: string[];
    seniority_match?: boolean;
    role_match?: boolean;
  };
}

interface RequestData {
  id: string;
  requester?: string;
  channel_id?: string;
  content: string;
  parsed_skills?: {
    role?: string;
    seniority?: string;
    must_have?: string[];
    nice_to_have?: string[];
    extra_keywords?: string[];
  };
  seniority_hint?: string;
  role_hint?: string;
  candidates?: Candidate[];
  created_at: string;
}

interface MatchResult {
  id: string;
  name: string;
  email: string;
  location: string;
  seniority: string;
  last_project: string;
  cv_link: string;
  parsed_skills: {
    must_have: string[];
    nice_to_have: string[];
  };
  match_score?: number;
}

interface SearchResponse {
  matches: MatchResult[];
  search_query: string;
  total_found: number;
  processing_time?: number;
}

export default function SearchMatchesPage() {
  const [searchText, setSearchText] = useState('');
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const [processedData, setProcessedData] = useState<SearchResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lastRequest, setLastRequest] = useState<RequestData | null>(null);

  // Helper function for toast notifications (simplified to avoid SSR issues)
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // Simple console logging for now to avoid DOM manipulation during SSR
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    console.log(`${icon} ${message}`);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('El archivo es muy grande. Máximo 5MB', 'error');
      return;
    }
    
    // Store the file for sending to n8n
    setSelectedFile(file);
    
    // Don't clear search completely - just clear results
    setMatches([]);
    setError('');
    setProcessedData(null);
    setLastSearchQuery('');
    
    showToast(`Archivo "${file.name}" seleccionado. Se enviará directamente a n8n`, 'success');
  };

  const sendToN8N = async (url: string, options: RequestInit) => {
    console.log('🚀 SENDING TO N8N:', {
      url,
      method: options.method,
      headers: options.headers,
      hasBody: !!options.body
    });
    
    const response = await fetch(url, options);
    console.log('📨 RESPONSE FROM N8N:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    return response;
  };

  const handleSearch = async () => {
    if (!searchText.trim() && !selectedFile) {
      showToast('❌ Por favor ingresa texto o selecciona un archivo', 'error');
      return;
    }

    setLoading(true);
    setError('');
    setMatches([]);
    setProcessedData(null);
    setLastRequest(null); // Limpiar la búsqueda anterior

    try {
      showToast('🔍 Procesando con n8n...', 'info');

      let response: Response;
      
      console.log('🔍 Debug - selectedFile:', !!selectedFile, 'searchText:', !!searchText.trim());
      console.log('🔍 Debug - fetch method will be POST');
      
      if (selectedFile) {
        // Send file to n8n
        console.log('📄 Debug - Sending file:', selectedFile.name, selectedFile.type, selectedFile.size, 'with channel_id: web app');
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('channel_id', 'web app');
        if (searchText.trim()) {
          formData.append('text', searchText.trim());
        }
        
        response = await sendToN8N('https://laucho.app.n8n.cloud/webhook/mind-intake', {
          method: 'POST', // MUST BE POST - NO GET ALLOWED
          headers: {
            'Accept': 'application/json',
          },
          body: formData,
        });
      } else {
        // Send text only
        console.log('📝 Debug - Sending text only:', searchText.trim().substring(0, 50) + '...', 'with channel_id: web app');
        response = await sendToN8N('https://laucho.app.n8n.cloud/webhook/mind-intake', {
          method: 'POST', // MUST BE POST - NO GET ALLOWED  
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            text: searchText.trim(),
            channel_id: 'web app'
          }),
        });
      }

      if (!response.ok) {
        // Handle specific n8n webhook errors
        if (response.status === 404) {
          throw new Error('El webhook de n8n no está registrado. Ejecuta primero el workflow en n8n.');
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Check for n8n webhook registration error
      if (result.code === 404 && result.message?.includes('not registered')) {
        throw new Error('🚨 El webhook de n8n no está activo. En n8n: Ejecuta el workflow primero.');
      }
      console.log('📨 Raw n8n response:', result);
      
      // Parse n8n response to extract structured outputs
      let structuredOutputs: any[] = [];
      
      // Check if n8n returned an error
      if (result.error) {
        console.error('❌ n8n returned error:', result.error);
        showToast(`❌ Error de n8n: ${result.error.message || 'Error desconocido'}`, 'error');
        setLoading(false);
        return;
      }
      
      // Check if n8n returned "no items found" response
      if (result.code === 0 && result.message === "No item to return was found") {
        console.log('✅ FIXED: n8n no items found - this is expected when no candidates match');
        showToast('ℹ️ No se encontraron candidatos que coincidan con los criterios de búsqueda', 'info');
        setMatches([]);
        setProcessedData({
          matches: [],
          search_query: searchText,
          total_found: 0,
          processing_time: Date.now()
        });
        setLastSearchQuery(searchText);
        setLoading(false);
        return;
      }
      
      // Check for other "no candidates" responses from n8n
      if (result.code === 0 && result.message && (
        result.message.includes("No candidates") ||
        result.message.includes("no candidates") ||
        result.message.includes("Candidates not matched") ||
        result.message.includes("candidates not matched")
      )) {
        console.log('✅ n8n: No candidates found -', result.message);
        showToast('ℹ️ No se encontraron candidatos que coincidan con los criterios de búsqueda', 'info');
        setMatches([]);
        setProcessedData({
          matches: [],
          search_query: searchText,
          total_found: 0,
          processing_time: Date.now()
        });
        setLastSearchQuery(searchText);
        setLoading(false);
        return;
      }
      
      // Check for other "no results" messages from n8n
      if (result.message && (
        result.message.includes("No item") || 
        result.message.includes("no results") ||
        result.message.includes("no matches") ||
        result.message.includes("not found")
      )) {
        console.log('ℹ️ n8n: No results message -', result.message);
        showToast('ℹ️ No se encontraron candidatos que coincidan con los criterios de búsqueda', 'info');
        setMatches([]);
        setProcessedData({
          matches: [],
          search_query: searchText,
          total_found: 0,
          processing_time: Date.now()
        });
        setLastSearchQuery(searchText);
        setLoading(false);
        return;
      }
      
      // Handle n8n success response with request_id and candidates_count
      if (result.success && result.request_id && result.candidates_count !== undefined) {
        console.log('✅ n8n processed successfully:', result);
        showToast(`✅ n8n procesó la búsqueda exitosamente. ${result.candidates_count} candidatos encontrados.`, 'success');
        
        // Set placeholder matches to indicate candidates are being loaded
        const placeholderMatches = Array.from({ length: result.candidates_count }, (_, i) => ({
          id: `loading-${i}`,
          name: 'Cargando...',
          email: '',
          location: '',
          seniority: '',
          last_project: '',
          cv_link: '',
          parsed_skills: {
            must_have: [],
            nice_to_have: []
          },
          match_score: 0
        }));
        
        setMatches(placeholderMatches);
        setProcessedData({
          matches: placeholderMatches,
          search_query: searchText,
          total_found: result.candidates_count,
          processing_time: Date.now()
        });
        setLastSearchQuery(searchText);
        setLoading(false);
        
        // Load the latest request to show the actual candidates
        setTimeout(() => {
          fetchLastRequest();
        }, 1000);
        return;
      }
      
      if (Array.isArray(result)) {
        // n8n returns array of {output: {...}}
        structuredOutputs = result.map((item: any) => item.output || item);
        console.log('📝 Extracted outputs:', structuredOutputs);
      } else if (result.outputs && Array.isArray(result.outputs)) {
        structuredOutputs = result.outputs;
      } else if (result.output) {
        // Single output case
        structuredOutputs = [result.output];
      } else {
        // If we get here, n8n returned an unexpected response structure
        console.log('⚠️ n8n returned unexpected response structure:', result);
        showToast('ℹ️ No se encontraron candidatos que coincidan con los criterios de búsqueda', 'info');
        setMatches([]);
        setProcessedData({
          matches: [],
          search_query: searchText,
          total_found: 0,
          processing_time: Date.now()
        });
        setLastSearchQuery(searchText);
        setLoading(false);
        return;
      }
      
      // Now call our /api/match endpoint for each output
      const allCandidates: MatchResult[] = [];
      
      showToast(`🔍 Buscando candidatos para ${structuredOutputs.length} perfiles...`, 'info');
      
      for (const output of structuredOutputs) {
        try {
          console.log('🎯 Calling /api/match with:', output);
          
          const matchResponse = await fetch('/api/match', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(output)
          });
          
          console.log(`🔍 Match response status: ${matchResponse.status} ${matchResponse.ok ? 'OK' : 'ERROR'}`);
          
          if (!matchResponse.ok) {
            console.warn(`⚠️ Match API failed for output:`, output);
            const errorData = await matchResponse.json().catch(() => ({}));
            console.warn(`❌ Error details:`, errorData);
            showToast(`❌ Error en búsqueda: ${errorData.message || 'Error desconocido'}`, 'error');
            continue;
          }
          
          const matchData = await matchResponse.json();
          console.log('✅ Match result:', matchData);
          
          // If no candidates found, log it but continue (don't show error)
          if (!matchData || matchData.length === 0) {
            console.log(`ℹ️ No candidates found for ${output.seniority} with skills: ${output.must_have?.join(', ')}`);
            continue;
          }
          
          // Transform match data to our format
          const candidates = matchData.map((candidate: any) => ({
            id: candidate.employee_id,
            name: candidate.name,
            email: candidate.email,
            location: candidate.location || '',
            seniority: candidate.seniority,
            last_project: '', // Not provided in current API
            cv_link: candidate.cv_link || '',
            parsed_skills: {
              must_have: candidate.matched_skills || [],
              nice_to_have: []
            },
            match_score: candidate.match_score || 0.5
          }));
          
          allCandidates.push(...candidates);
          
        } catch (error) {
          console.warn(`⚠️ Error calling match API for output:`, error);
        }
      }
      
      // Sort by match score and take top 5
      const topCandidates = allCandidates
        .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
        .slice(0, 5);
      
      // Show message if no candidates found
      if (topCandidates.length === 0) {
        showToast('ℹ️ No se encontraron candidatos que coincidan con los criterios de búsqueda', 'info');
      } else {
        showToast(`✅ Se encontraron ${topCandidates.length} candidatos`, 'success');
      }
      
      const searchResults: SearchResponse = {
        matches: topCandidates,
        search_query: searchText,
        total_found: topCandidates.length,
        processing_time: Date.now()
      };

      setMatches(searchResults.matches);
      setProcessedData(searchResults);
      setLastSearchQuery(searchResults.search_query);
      
      // Load the latest request from n8n pipeline (includes summaries)
      setTimeout(() => {
        fetchLastRequest();
      }, 2000); // Wait 2 seconds for n8n to process and save

    } catch (error) {
      console.error('Error searching matches:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      showToast(`❌ Error al buscar: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLastRequest = async () => {
    try {
      showToast('📋 Cargando última búsqueda...', 'info');
      
      // Fetch with proper headers
      const response = await fetch('/api/requests?limit=1&offset=0', {
        credentials: 'include',
        headers: {
          'Authorization': 'Basic ' + btoa('test:test123')
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Raw API response:', data);
        
        if (data.items && data.items.length > 0) {
          const latestRequest = data.items[0]; // El más reciente
          console.log('📋 Latest request loaded:', latestRequest);
          setLastRequest(latestRequest);
          showToast(`✅ Búsqueda guardada: ${latestRequest.candidates?.length || 0} candidatos encontrados (ID: ${latestRequest.id?.substring(0, 8)}...)`, 'success');
        } else {
          showToast('ℹ️ No hay búsquedas guardadas aún', 'info');
        }
      } else {
        const errorText = await response.text();
        console.error('📋 API Error:', response.status, errorText);
        showToast(`❌ Error ${response.status}: ${errorText}`, 'error');
      }
    } catch (error) {
      console.error('Error fetching last request:', error);
      showToast(`❌ Error de conexión: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
    }
  };

  const clearSearch = () => {
    setSearchText('');
    setMatches([]);
    setError('');
    setProcessedData(null);
    setLastSearchQuery('');
    setSelectedFile(null);
    setLastRequest(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-inter">🔍 Buscar Matches</h1>
        <p className="text-gray-600 mt-2">
          Busca candidatos escribiendo requisitos o subiendo un documento
        </p>
      </div>

        {/* Search Input */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="space-y-4">
            <label className="form-label">Texto de búsqueda</label>
            
            <textarea
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Ej: Necesitamos un desarrollador frontend senior con React, TypeScript y Next.js. Debe tener al menos 3 años de experiencia..."
              className="form-input h-32 resize-y"
              disabled={loading}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* File Upload */}
                <label className="btn btn-outline btn-secondary cursor-pointer">
                  {selectedFile ? `📄 ${selectedFile.name}` : '📄 Subir Archivo'}
                  <input
                    type="file"
                    accept=".txt,.pdf,.doc,.docx,.rtf,.md"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={loading}
                  />
                </label>

                {/* Character Count */}
                <span className="text-sm text-gray-500">
                  {searchText.length} caracteres
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={clearSearch}
                  disabled={loading}
                  className="btn btn-outline"
                >
                  🗑️ Limpiar
                </button>
                
                <button
                  onClick={fetchLastRequest}
                  disabled={loading}
                  className="btn btn-secondary"
                >
                  📋 Cargar Última Búsqueda
                </button>
                
                <button
                  onClick={handleSearch}
                  disabled={loading || (!searchText.trim() && !selectedFile)}
                  className="btn btn-primary"
                  style={{ 
                    backgroundColor: selectedFile ? '#10b981' : '#3b82f6',
                    borderColor: selectedFile ? '#059669' : '#2563eb'
                  }}
                >
                  {loading ? (
                    <>
                      <div className="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Procesando...
                    </>
                  ) : (
                    `🔍 Buscar Matches ${selectedFile ? '📄' : ''}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-red-500 text-lg mr-2">❌</span>
              <div>
                <h4 className="font-medium text-red-800">Error en la búsqueda</h4>
                <p className="text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        {processedData && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">📊 Resultados de la búsqueda</h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>🔍 Consulta: "{lastSearchQuery}"</span>
                <span>⏱️ {processedData.processing_time ? `${Math.round(processedData.processing_time)}ms` : 'Tiempo no disponible'}</span>
                <span>📊 {processedData.total_found} encontrados</span>
              </div>
            </div>

            {matches.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🤷‍♂️</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron matches</h3>
                <p className="text-gray-500">
                  Intenta ajustar tu búsqueda o contacto con el equipo para revisar los criterios.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {matches.map((match, index) => (
                  <div key={match.id || index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{match.name}</h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {match.seniority}
                          </span>
                          {match.match_score && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {Math.round(match.match_score * 100)}% match
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-600">
                              <strong>Email:</strong> {match.email}
                            </p>
                            {match.location && (
                              <p className="text-sm text-gray-600">
                                <strong>Ubicación:</strong> {match.location}
                              </p>
                            )}
                          </div>
                          <div>
                            {match.last_project && (
                              <p className="text-sm text-gray-600">
                                <strong>Último proyecto:</strong> {match.last_project}
                              </p>
                            )}
                          </div>
                        </div>

                        {match.parsed_skills && (
                          <div className="flex flex-wrap gap-4">
                            {match.parsed_skills.must_have && match.parsed_skills.must_have.length > 0 && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">🎯 Must Have:</p>
                                <div className="flex flex-wrap gap-1">
                                  {match.parsed_skills.must_have.map((skill, skillIndex) => (
                                    <span key={skillIndex} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {match.parsed_skills.nice_to_have && match.parsed_skills.nice_to_have.length > 0 && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">💡 Nice to Have:</p>
                                <div className="flex flex-wrap gap-1">
                                  {match.parsed_skills.nice_to_have.map((skill, skillIndex) => (
                                    <span key={skillIndex} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {match.cv_link && (
                          <div className="mt-3 pt-3 border-t">
                            <a 
                              href={match.cv_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              📄 Ver CV →
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Latest Request Results */}
        {lastRequest && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">📋 Última Búsqueda Guardada</h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>🆔 ID: {lastRequest.id}</span>
                <span>⏱️ {new Date(lastRequest.created_at).toLocaleString()}</span>
                <span>📊 {lastRequest.candidates?.length || 0} candidatos</span>
              </div>
            </div>

            {/* Request Info */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm">
                <div><strong>Consulta:</strong> "{lastRequest.content.substring(0, 100)}{lastRequest.content.length > 100 ? '...' : ''}"</div>
                {lastRequest.parsed_skills?.role && <div><strong>Rol:</strong> {lastRequest.parsed_skills.role}</div>}
                {lastRequest.parsed_skills?.seniority && <div><strong>Seniority:</strong> {lastRequest.parsed_skills.seniority}</div>}
                {lastRequest.parsed_skills?.must_have && lastRequest.parsed_skills.must_have.length > 0 && (
                  <div><strong>Skills requeridas:</strong> {lastRequest.parsed_skills.must_have.join(', ')}</div>
                )}
              </div>
            </div>

            {/* Candidates */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Candidatos Encontrados ({lastRequest.candidates?.length || 0})</h3>
              
              {lastRequest.candidates && lastRequest.candidates.length > 0 ? (
                lastRequest.candidates.map((candidate, index) => (
                  <div key={candidate.employee_id || index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-900">{candidate.name || 'Sin nombre'}</span>
                          <span className="text-xs text-gray-500">{candidate.email || 'Sin email'}</span>
                        </div>
                        {candidate.score && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Score: {(candidate.score * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      {candidate.match_details?.matched_skills && candidate.match_details.matched_skills.length > 0 && (
                        <div className="text-xs text-gray-500">
                          Skills: {candidate.match_details.matched_skills.join(', ')}
                        </div>
                      )}
                    </div>
                    
                    {/* Candidate Details */}
                    <div className="mb-3 flex items-center gap-4 text-sm text-gray-600">
                      {candidate.seniority && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          👔 {candidate.seniority}
                        </span>
                      )}
                      {candidate.location && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          📍 {candidate.location}
                        </span>
                      )}
                    </div>
                    
                    <div className="mb-3">
                      <h4 className="font-medium text-gray-900 mb-2">📝 Summary</h4>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                        {candidate.summary}
                      </p>
                    </div>
                    
                    {candidate.match_details && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        {candidate.match_details.seniority_match !== undefined && (
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            candidate.match_details.seniority_match 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            Seniority: {candidate.match_details.seniority_match ? '✅ Match' : '❌ No match'}
                          </span>
                        )}
                        {candidate.match_details.role_match !== undefined && (
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            candidate.match_details.role_match 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            Role: {candidate.match_details.role_match ? '✅ Match' : '❌ No match'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No hay candidatos disponibles en el último request
                </div>
              )}
            </div>
          </div>
        )}

      </div>
  );
}
