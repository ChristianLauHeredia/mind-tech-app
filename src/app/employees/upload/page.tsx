'use client';
import { useState } from 'react';

type OperationType = 'create' | 'update' | 'delete';

export default function UploadCSV() {
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [operationType, setOperationType] = useState<OperationType>('create');
  
  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = `/api/employees/template?operation=${operationType}`;
    link.download = `employees_${operationType}_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMsg('');

    try {
      const text = await file.text();
      const res = await fetch('/api/employees/bulk', { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'X-Operation-Type': operationType
        },
        body: JSON.stringify({ csv: text, operation: operationType })
      });
      
      const result = await res.text();
      setMsg(result);
    } catch (error) {
      setMsg('Error al procesar el archivo CSV');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Carga Masiva de Empleados</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Gestiona empleados mediante archivos CSV</p>
        </div>
        <a href="/employees" className="btn btn-secondary text-sm">
          ← Volver a Empleados
        </a>
      </div>

      {/* Operation Type Selection */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">Tipo de Operación</h2>
          <p className="text-sm text-gray-600 mt-1">Selecciona qué tipo de operación deseas realizar</p>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => setOperationType('create')}
              className={`p-4 rounded-lg border-2 transition-all ${
                operationType === 'create'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-2">➕</div>
              <div className="font-semibold">Crear Empleados</div>
              <div className="text-sm opacity-75">Agregar nuevos empleados al sistema</div>
            </button>
            
            <button
              onClick={() => setOperationType('update')}
              className={`p-4 rounded-lg border-2 transition-all ${
                operationType === 'update'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-2">✏️</div>
              <div className="font-semibold">Actualizar Empleados</div>
              <div className="text-sm opacity-75">Modificar empleados existentes</div>
            </button>
            
            <button
              onClick={() => setOperationType('delete')}
              className={`p-4 rounded-lg border-2 transition-all ${
                operationType === 'delete'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-2">🗑️</div>
              <div className="font-semibold">Eliminar Empleados</div>
              <div className="text-sm opacity-75">Eliminar empleados del sistema</div>
            </button>
          </div>
        </div>
      </div>

      {/* Template Download */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">📋 Template CSV</h2>
          <p className="text-sm text-gray-600 mt-1">
            Descarga el template con el formato correcto para {operationType === 'create' ? 'crear' : operationType === 'update' ? 'actualizar' : 'eliminar'} empleados
          </p>
        </div>
        <div className="card-body">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <button
              onClick={downloadTemplate}
              className="btn btn-primary text-sm"
            >
              📥 Descargar Template CSV
            </button>
            <div className="text-sm text-gray-600">
              {operationType === 'create' && 'Template para agregar nuevos empleados'}
              {operationType === 'update' && 'Template para actualizar empleados existentes (incluye ID)'}
              {operationType === 'delete' && 'Template para eliminar empleados (solo necesita email o ID)'}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">📤 Cargar Archivo CSV</h2>
          <p className="text-sm text-gray-600 mt-1">
            Selecciona un archivo CSV con los datos de los empleados para {operationType === 'create' ? 'crear' : operationType === 'update' ? 'actualizar' : 'eliminar'}
          </p>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileUpload}
                disabled={loading}
                className="form-input flex-1"
              />
              <button
                onClick={() => {
                  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                  if (input?.files?.[0]) {
                    handleFileUpload({ target: input } as any);
                  }
                }}
                disabled={loading}
                className="btn btn-primary text-sm"
              >
                {loading ? '⏳ Procesando...' : '🚀 Procesar CSV'}
              </button>
            </div>
            
            {loading && (
              <div className="flex items-center gap-3 text-primary-600">
                <div className="spinner w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full"></div>
                Procesando archivo...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">📝 Instrucciones</h2>
        </div>
        <div className="card-body">
          {operationType === 'create' && (
            <div className="space-y-3">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">✅ Campos Obligatorios</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• <strong>first_name</strong> - Nombre del empleado</li>
                  <li>• <strong>last_name</strong> - Apellido del empleado</li>
                  <li>• <strong>email</strong> - Email único (no duplicados)</li>
                  <li>• <strong>position</strong> - Posición o cargo</li>
                  <li>• <strong>seniority</strong> - JR, SSR, SR, STAFF, PRINC</li>
                </ul>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">ℹ️ Campos Opcionales</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>location</strong> - Ubicación (CDMX, GDL, Remote, etc.)</li>
                  <li>• <strong>timezone</strong> - Zona horaria</li>
                  <li>• <strong>manager_email</strong> - Email del manager</li>
                </ul>
              </div>
            </div>
          )}

          {operationType === 'update' && (
            <div className="space-y-3">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Campos Requeridos</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• <strong>id</strong> - ID del empleado a actualizar (obligatorio)</li>
                  <li>• <strong>email</strong> - Email del empleado (alternativo al ID)</li>
                </ul>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">✏️ Campos Actualizables</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>first_name, last_name</strong> - Nombre completo</li>
                  <li>• <strong>position, seniority</strong> - Posición y nivel</li>
                  <li>• <strong>location, timezone</strong> - Ubicación y zona horaria</li>
                  <li>• <strong>manager_email</strong> - Email del manager</li>
                  <li>• <strong>active</strong> - true/false para activar/desactivar</li>
                </ul>
              </div>
            </div>
          )}

          {operationType === 'delete' && (
            <div className="space-y-3">
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-2">🗑️ Campos para Eliminar</h3>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• <strong>id</strong> - ID del empleado (recomendado)</li>
                  <li>• <strong>email</strong> - Email del empleado (alternativo)</li>
                </ul>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-orange-800 mb-2">⚠️ Advertencia</h3>
                <p className="text-sm text-orange-700">
                  Esta operación eliminará permanentemente los empleados del sistema. 
                  Se eliminarán también sus skills asociadas y matches.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {msg && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">📊 Resultado de la Operación</h2>
          </div>
          <div className="card-body">
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm whitespace-pre-wrap font-mono">{msg}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
