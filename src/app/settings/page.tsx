'use client';
import { useState } from 'react';

export default function SettingsPage() {
  const [driveFolderId, setDriveFolderId] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Simular guardado - por ahora solo mostrar toast
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600 mt-2">Configura los parámetros del sistema</p>
      </div>

      {/* Settings Form */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">Configuración General</h2>
          <p className="text-sm text-gray-600 mt-1">Configura los parámetros principales del sistema</p>
        </div>
        <div className="card-body">
          <div className="space-y-6">
            {/* Google Drive Folder ID */}
            <div>
              <label className="form-label">
                Google Drive Folder ID
              </label>
              <input
                type="text"
                value={driveFolderId}
                onChange={(e) => setDriveFolderId(e.target.value)}
                className="form-input"
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              />
              <p className="text-sm text-gray-500 mt-1">
                ID de la carpeta de Google Drive donde se almacenan los CVs
              </p>
            </div>

            {/* Admin Email */}
            <div>
              <label className="form-label">
                Admin Email
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="form-input"
                placeholder="admin@company.com"
              />
              <p className="text-sm text-gray-500 mt-1">
                Email del administrador del sistema
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? (
                  <>
                    <div className="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  '💾 Guardar Configuración'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          <div className="flex items-center">
            <span className="mr-2">✅</span>
            <span>Configuración guardada exitosamente</span>
          </div>
        </div>
      )}
    </div>
  );
}
