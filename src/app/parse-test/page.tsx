'use client';
import { useState } from 'react';

export default function ParseTest() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleParse = async () => {
    if (!text.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        const error = await response.text();
        setResult({ error });
      }
    } catch (err) {
      setResult({ error: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-4">Test Parse Endpoint</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Texto a analizar:</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-32 border p-3 rounded"
            placeholder="Ejemplo: Necesitamos un Frontend Developer Senior con experiencia en React, TypeScript y Next.js. Debe tener conocimientos en testing con Jest y experiencia con APIs REST..."
          />
        </div>
        
        <button
          onClick={handleParse}
          disabled={loading || !text.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Analizando...' : 'Analizar'}
        </button>
        
        {result && (
          <div className="mt-4">
            <h2 className="text-lg font-medium mb-2">Resultado:</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
