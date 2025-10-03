'use client';

import { useState } from 'react';
import Layout from '@/app/components/Layout';

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

  // Helper function for toast notifications
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    toast.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded shadow-lg z-50`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setSearchText(text);
      };
      reader.readAsText(file);
      showToast('📄 Documento cargado exitosamente', 'success');
    } else if (file) {
      showToast('❌ Solo se permiten archivos de texto (.txt)', 'error');
    }
  };

  const handleSearch = async () => {
    if (!searchText.trim()) {
      showToast('❌ Por favor ingresa un texto de búsqueda', 'error');
      return;
    }

    setLoading(true);
    setError('');
    setMatches([]);
    setProcessedData(null);

    try {
      showToast('🔍 Buscando matches...', 'info');

      const response = await fetch(`https://laucho.app.n8n.cloud/webhook-test/mind-intake?text=${encodeURIComponent(searchText.trim())}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Parse the n8n response
      let searchResults: SearchResponse;
      
      if (result.body?.text && typeof result.body.text === 'string') {
        // If n8n returns the raw text, we need to simulate processing
        searchResults = {
          matches: [],
          search_query: result.body.text,
          total_found: 0,
          processing_time: Date.now()
        };
        
        showToast('⚠️ n8n recibió el texto pero no procesó los matches aún', 'info');
      } else if (result.matches && Array.isArray(result.matches)) {
        // If n8n already processed and returned matches
        searchResults = {
          matches: result.matches.slice(0, 5), // Max 5 matches
          search_query: result.search_query || searchText,
          total_found: result.matches.length,
          processing_time: result.processing_time
        };
        
        showToast(`✅ Encontrados ${searchResults.matches.length} matches`, 'success');
      } else {
        // Fallback: simulate processing
        searchResults = {
          matches: [],
          search_query: searchText,
          total_found: 0,
          processing_time: Date.now()
        };
        
        showToast('📝 Texto procesado por n8n, esperando matches...', 'info');
      }

      setMatches(searchResults.matches);
      setProcessedData(searchResults);
      setLastSearchQuery(searchResults.search_query);

    } catch (error) {
      console.error('Error searching matches:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      showToast(`❌ Error al buscar: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchText('');
    setMatches([]);
    setError('');
    setProcessedData(null);
    setLastSearchQuery('');
  };

  return (
    <Layout>
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
                  📄 Subir Documento
                  <input
                    type="file"
                    accept=".txt"
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
              <div className="flex gap-2">
                <button
                  onClick={clearSearch}
                  disabled={loading}
                  className="btn btn-outline"
                >
                  🗑️ Limpiar
                </button>
                
                <button
                  onClick={handleSearch}
                  disabled={loading || !searchText.trim()}
                  className="btn btn-primary"
                >
                  {loading ? (
                    <>
                      <div className="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Procesando...
                    </>
                  ) : (
                    '🔍 Buscar Matches'
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

        {/* API Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">🔌 Información de la conexión</h3>
          <p className="text-sm text-gray-600">
            Esta página se conecta directamente al webhook n8n{' '}
            <code className="bg-gray-200 px-1 rounded">webhook-test/mind-intake</code> y procesa 
            la respuesta para mostrar entre 0-5 matches encontrados.
          </p>
        </div>
      </div>
    </Layout>
  );
}
