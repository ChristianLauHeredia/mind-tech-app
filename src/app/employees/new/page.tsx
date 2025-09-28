'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface EmployeeFormData {
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  seniority: string;
  location: string;
  timezone: string;
  manager_email: string;
  cv_url: string;
}

export default function NewEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<EmployeeFormData>({
    first_name: '',
    last_name: '',
    email: '',
    position: '',
    seniority: 'SR',
    location: '',
    timezone: 'America/Mexico_City',
    manager_email: '',
    cv_url: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        router.push('/employees');
      } else {
        const error = await response.text();
        alert(`Error: ${error}`);
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      alert('Error al crear empleado');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Nuevo Empleado</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Agregar un nuevo empleado al sistema</p>
        </div>
        <a href="/employees" className="btn btn-secondary text-sm">
          ← Volver a Empleados
        </a>
      </div>

      {/* Form */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">Información del Empleado</h2>
          <p className="text-sm text-gray-600 mt-1">Completa los datos básicos del empleado</p>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Nombre *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="form-input"
                  required
                  placeholder="Ej: Juan"
                />
              </div>
              
              <div>
                <label className="form-label">Apellido *</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="form-input"
                  required
                  placeholder="Ej: Pérez"
                />
              </div>
              
              <div>
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  required
                  placeholder="Ej: juan.perez@company.com"
                />
              </div>
              
              <div>
                <label className="form-label">Posición *</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className="form-input"
                  required
                  placeholder="Ej: Frontend Engineer"
                />
              </div>
              
              <div>
                <label className="form-label">Seniority *</label>
                <select
                  name="seniority"
                  value={formData.seniority}
                  onChange={handleChange}
                  className="form-input"
                  required
                >
                  <option value="JR">Junior (JR)</option>
                  <option value="SSR">Semi-Senior (SSR)</option>
                  <option value="SR">Senior (SR)</option>
                  <option value="STAFF">Staff</option>
                  <option value="PRINC">Principal</option>
                </select>
              </div>
              
              <div>
                <label className="form-label">Ubicación</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Ej: CDMX, GDL, Remote"
                />
              </div>
              
              <div>
                <label className="form-label">Zona Horaria</label>
                <select
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="America/Mexico_City">America/Mexico_City</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                  <option value="Europe/Madrid">Europe/Madrid</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
              
              <div>
                <label className="form-label">Email del Manager</label>
                <input
                  type="email"
                  name="manager_email"
                  value={formData.manager_email}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Ej: manager@company.com"
                />
              </div>
              
              <div className="sm:col-span-2">
                <label className="form-label">CV URL</label>
                <input
                  type="url"
                  name="cv_url"
                  value={formData.cv_url}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="https://drive.google.com/file/d/.../view"
                />
                <p className="text-sm text-gray-500 mt-1">
                  URL completa del CV (Google Drive, Dropbox, etc.)
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? (
                  <>
                    <div className="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Creando...
                  </>
                ) : (
                  '✅ Crear Empleado'
                )}
              </button>
              <a href="/employees" className="btn btn-secondary">
                Cancelar
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}