'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  seniority: string;
  location?: string;
  timezone?: string;
  manager_email?: string;
  active: boolean;
}

interface CV {
  employee_id: string;
  url: string;
  updated_at: string;
}

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
  active: boolean;
}

export default function EditEmployeePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [cv, setCv] = useState<CV | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>({
    first_name: '',
    last_name: '',
    email: '',
    position: '',
    seniority: 'SR',
    location: '',
    timezone: 'America/Mexico_City',
    manager_email: '',
    cv_url: '',
    active: true
  });

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        // Fetch employee data
        const response = await fetch(`/api/employees/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setEmployee(data);
          setFormData({
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
            position: data.position,
            seniority: data.seniority,
            location: data.location || '',
            timezone: data.timezone || 'America/Mexico_City',
            manager_email: data.manager_email || '',
            cv_url: '',
            active: data.active
          });
        } else {
          alert('Empleado no encontrado');
          router.push('/employees');
          return;
        }

        // Fetch CV data
        const cvResponse = await fetch(`/api/employees/${params.id}/cv`);
        if (cvResponse.ok) {
          const cvData = await cvResponse.json();
          setCv(cvData);
          setFormData(prev => ({
            ...prev,
            cv_url: cvData.url || ''
          }));
        }
      } catch (error) {
        console.error('Error fetching employee:', error);
        alert('Error al cargar empleado');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Update employee data
      const { cv_url, ...employeeData } = formData;
      const response = await fetch(`/api/employees/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData)
      });

      if (!response.ok) {
        const error = await response.text();
        alert(`Error: ${error}`);
        return;
      }

      // Update CV data if provided
      if (cv_url) {
        const cvResponse = await fetch(`/api/employees/${params.id}/cv`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: cv_url
          })
        });

        if (!cvResponse.ok) {
          const error = await cvResponse.text();
          alert(`Error actualizando CV: ${error}`);
          return;
        }
      }

      router.push('/employees');
    } catch (error) {
      console.error('Error updating employee:', error);
      alert('Error al actualizar empleado');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="spinner w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando empleado...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">👤</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Empleado no encontrado</h3>
        <p className="text-gray-500 mb-4">El empleado que buscas no existe.</p>
        <a href="/employees" className="btn btn-primary">
          ← Volver a Empleados
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Editar Empleado</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            Editando: {employee.first_name} {employee.last_name}
          </p>
        </div>
        <a href="/employees" className="btn btn-secondary text-sm">
          ← Volver a Empleados
        </a>
      </div>

      {/* Form */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">Información del Empleado</h2>
          <p className="text-sm text-gray-600 mt-1">Actualiza los datos del empleado</p>
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

            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                />
                <label className="form-label mb-0">Empleado activo</label>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Los empleados inactivos no aparecerán en los matches
              </p>
            </div>

            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? (
                  <>
                    <div className="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  '💾 Guardar Cambios'
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