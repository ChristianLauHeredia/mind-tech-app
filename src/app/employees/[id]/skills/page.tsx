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
}

interface Skill {
  id: string;
  name: string;
  category: string;
}

interface EmployeeSkill {
  employee_id: string;
  skill_id: string;
  skill_name: string;
  proficiency_level: number;
  years?: number;
}

export default function EmployeeSkillsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [employeeSkills, setEmployeeSkills] = useState<EmployeeSkill[]>([]);
  const [newSkill, setNewSkill] = useState({
    skill_id: '',
    proficiency_level: 3,
    years: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch employee data
        const employeeResponse = await fetch(`/api/employees/${params.id}`);
        if (employeeResponse.ok) {
          const employeeData = await employeeResponse.json();
          setEmployee(employeeData);
        }

        // Fetch available skills
        const skillsResponse = await fetch('/api/skills');
        if (skillsResponse.ok) {
          const skillsData = await skillsResponse.json();
          setAvailableSkills(skillsData);
        }

        // Fetch employee skills
        const employeeSkillsResponse = await fetch(`/api/employees/${params.id}/skills`);
        if (employeeSkillsResponse.ok) {
          const employeeSkillsData = await employeeSkillsResponse.json();
          setEmployeeSkills(employeeSkillsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  const handleAddSkill = async () => {
    if (!newSkill.skill_id) {
      alert('Selecciona una skill');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/employees/${params.id}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSkill)
      });

      if (response.ok) {
        // Refresh employee skills
        const employeeSkillsResponse = await fetch(`/api/employees/${params.id}/skills`);
        if (employeeSkillsResponse.ok) {
          const employeeSkillsData = await employeeSkillsResponse.json();
          setEmployeeSkills(employeeSkillsData);
        }
        setNewSkill({ skill_id: '', proficiency_level: 3, years: 0 });
      } else {
        const error = await response.text();
        alert(`Error: ${error}`);
      }
    } catch (error) {
      console.error('Error adding skill:', error);
      alert('Error al agregar skill');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta skill?')) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/employees/${params.id}/skills/${skillId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Refresh employee skills
        const employeeSkillsResponse = await fetch(`/api/employees/${params.id}/skills`);
        if (employeeSkillsResponse.ok) {
          const employeeSkillsData = await employeeSkillsResponse.json();
          setEmployeeSkills(employeeSkillsData);
        }
      } else {
        const error = await response.text();
        alert(`Error: ${error}`);
      }
    } catch (error) {
      console.error('Error removing skill:', error);
      alert('Error al eliminar skill');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSkill = async (skillId: string, proficiencyLevel: number, years: number) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/employees/${params.id}/skills/${skillId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proficiency_level: proficiencyLevel, years })
      });

      if (response.ok) {
        // Refresh employee skills
        const employeeSkillsResponse = await fetch(`/api/employees/${params.id}/skills`);
        if (employeeSkillsResponse.ok) {
          const employeeSkillsData = await employeeSkillsResponse.json();
          setEmployeeSkills(employeeSkillsData);
        }
      } else {
        const error = await response.text();
        alert(`Error: ${error}`);
      }
    } catch (error) {
      console.error('Error updating skill:', error);
      alert('Error al actualizar skill');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="spinner w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando skills del empleado...</p>
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

  const availableSkillsFiltered = availableSkills.filter(skill => 
    !employeeSkills.some(es => es.skill_id === skill.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Skills de {employee.first_name} {employee.last_name}</h1>
          <p className="text-gray-600 mt-2">
            {employee.position} • {employee.seniority} • {employee.email}
          </p>
        </div>
        <div className="flex gap-3">
          <a href="/skills" className="btn btn-secondary">
            🎯 Gestionar Skills
          </a>
          <a href={`/employees/${params.id}/edit`} className="btn btn-secondary">
            ✏️ Editar Empleado
          </a>
          <a href="/employees" className="btn btn-secondary">
            ← Volver a Empleados
          </a>
        </div>
      </div>

      {/* Add New Skill */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">➕ Agregar Nueva Skill</h2>
          <p className="text-sm text-gray-600 mt-1">Asigna una nueva skill al empleado</p>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="form-label">Skill</label>
              <select
                value={newSkill.skill_id}
                onChange={(e) => setNewSkill({ ...newSkill, skill_id: e.target.value })}
                className="form-input"
              >
                <option value="">Selecciona una skill</option>
                {availableSkillsFiltered.length === 0 ? (
                  <option value="" disabled>No hay skills disponibles</option>
                ) : (
                  availableSkillsFiltered.map(skill => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name} ({skill.category})
                    </option>
                  ))
                )}
              </select>
            </div>
            
            <div>
              <label className="form-label">Nivel de Competencia</label>
              <select
                value={newSkill.proficiency_level}
                onChange={(e) => setNewSkill({ ...newSkill, proficiency_level: Number(e.target.value) })}
                className="form-input"
              >
                <option value={1}>1 - Principiante</option>
                <option value={2}>2 - Básico</option>
                <option value={3}>3 - Intermedio</option>
                <option value={4}>4 - Avanzado</option>
                <option value={5}>5 - Experto</option>
              </select>
            </div>
            
            <div>
              <label className="form-label">Años de Experiencia</label>
              <input
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={newSkill.years}
                onChange={(e) => setNewSkill({ ...newSkill, years: Number(e.target.value) })}
                className="form-input"
                placeholder="0"
              />
            </div>
            
            <div className="flex items-end">
              {availableSkillsFiltered.length === 0 ? (
                <div className="w-full text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-yellow-800 text-sm mb-2">No hay skills disponibles para agregar</p>
                  <a href="/skills" className="btn btn-sm btn-primary">
                    🎯 Gestionar Skills
                  </a>
                </div>
              ) : (
                <button
                  onClick={handleAddSkill}
                  disabled={saving || !newSkill.skill_id}
                  className="btn btn-primary w-full"
                >
                  {saving ? (
                    <>
                      <div className="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Agregando...
                    </>
                  ) : (
                    '✅ Agregar Skill'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Current Skills */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">🎯 Skills Actuales</h2>
          <p className="text-sm text-gray-600 mt-1">
            {employeeSkills.length} skills asignadas
          </p>
        </div>
        <div className="card-body">
          {employeeSkills.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay skills asignadas</h3>
              <p className="text-gray-500">Agrega la primera skill usando el formulario de arriba.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employeeSkills.map((skill) => (
                <div key={skill.skill_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{skill.skill_name}</h3>
                    <button
                      onClick={() => handleRemoveSkill(skill.skill_id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                      disabled={saving}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="form-label text-sm">Nivel de Competencia</label>
                      <select
                        value={skill.proficiency_level}
                        onChange={(e) => handleUpdateSkill(skill.skill_id, Number(e.target.value), skill.years || 0)}
                        className="form-input text-sm"
                        disabled={saving}
                      >
                        <option value={1}>1 - Principiante</option>
                        <option value={2}>2 - Básico</option>
                        <option value={3}>3 - Intermedio</option>
                        <option value={4}>4 - Avanzado</option>
                        <option value={5}>5 - Experto</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="form-label text-sm">Años de Experiencia</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={skill.years || 0}
                        onChange={(e) => handleUpdateSkill(skill.skill_id, skill.proficiency_level, Number(e.target.value))}
                        className="form-input text-sm"
                        disabled={saving}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Nivel: {skill.proficiency_level}/5</span>
                      <span>{skill.years || 0} años</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
