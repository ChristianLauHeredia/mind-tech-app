'use client';
import { useState, useEffect } from 'react';

interface Skill {
  id: string;
  name: string;
  category: string;
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [newSkill, setNewSkill] = useState({
    name: '',
    category: 'General'
  });

  const categories = [
    'Frontend',
    'Backend', 
    'Database',
    'DevOps',
    'Mobile',
    'AI/ML',
    'Design',
    'Testing',
    'Automation',
    'General'
  ];

  const fetchSkills = async () => {
    try {
      const response = await fetch('/api/skills');
      const data = await response.json();
      setSkills(data);
    } catch (error) {
      console.error('Error fetching skills:', error);
      alert('Error al cargar skills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleAddSkill = async () => {
    if (!newSkill.name.trim()) {
      alert('El nombre de la skill es obligatorio');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSkill)
      });

      if (response.ok) {
        const addedSkill = await response.json();
        setSkills([...skills, addedSkill]);
        setNewSkill({ name: '', category: 'General' });
        setShowAddForm(false);
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

  const handleEditSkill = async () => {
    if (!editingSkill || !editingSkill.name.trim()) {
      alert('El nombre de la skill es obligatorio');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/skills/${editingSkill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingSkill.name,
          category: editingSkill.category
        })
      });

      if (response.ok) {
        setSkills(skills.map(skill => 
          skill.id === editingSkill.id ? editingSkill : skill
        ));
        setEditingSkill(null);
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

  const handleDeleteSkill = async (skillId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta skill? Esto también eliminará todas las asignaciones de esta skill a empleados.')) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/skills/${skillId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSkills(skills.filter(skill => skill.id !== skillId));
      } else {
        const error = await response.text();
        alert(`Error: ${error}`);
      }
    } catch (error) {
      console.error('Error deleting skill:', error);
      alert('Error al eliminar skill');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (skill: Skill) => {
    setEditingSkill({ ...skill });
    setShowAddForm(false);
  };

  const cancelEditing = () => {
    setEditingSkill(null);
    setShowAddForm(false);
    setNewSkill({ name: '', category: 'General' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="spinner w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando skills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Skills</h1>
          <p className="text-gray-600 mt-2">
            {skills.length} skills disponibles en el sistema
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
          >
            ➕ Nueva Skill
          </button>
          <a href="/employees" className="btn btn-secondary">
            ← Volver a Empleados
          </a>
        </div>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingSkill) && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingSkill ? '✏️ Editar Skill' : '➕ Nueva Skill'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {editingSkill ? 'Modifica los datos de la skill' : 'Agrega una nueva skill al sistema'}
            </p>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Nombre de la Skill *</label>
                <input
                  type="text"
                  value={editingSkill ? editingSkill.name : newSkill.name}
                  onChange={(e) => {
                    if (editingSkill) {
                      setEditingSkill({ ...editingSkill, name: e.target.value });
                    } else {
                      setNewSkill({ ...newSkill, name: e.target.value });
                    }
                  }}
                  className="form-input"
                  placeholder="Ej: React, Node.js, PostgreSQL"
                  required
                />
              </div>
              
              <div>
                <label className="form-label">Categoría</label>
                <select
                  value={editingSkill ? editingSkill.category : newSkill.category}
                  onChange={(e) => {
                    if (editingSkill) {
                      setEditingSkill({ ...editingSkill, category: e.target.value });
                    } else {
                      setNewSkill({ ...newSkill, category: e.target.value });
                    }
                  }}
                  className="form-input"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                onClick={editingSkill ? handleEditSkill : handleAddSkill}
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? (
                  <>
                    <div className="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    {editingSkill ? 'Guardando...' : 'Agregando...'}
                  </>
                ) : (
                  editingSkill ? '💾 Guardar Cambios' : '✅ Agregar Skill'
                )}
              </button>
              <button onClick={cancelEditing} className="btn btn-secondary">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skills Grid */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">Skills Disponibles</h2>
          <p className="text-sm text-gray-600 mt-1">Gestiona todas las skills del sistema</p>
        </div>
        <div className="card-body">
          {skills.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay skills registradas</h3>
              <p className="text-gray-500 mb-4">Agrega la primera skill usando el botón de arriba.</p>
              <button 
                onClick={() => setShowAddForm(true)}
                className="btn btn-primary"
              >
                ➕ Agregar Primera Skill
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map((skill) => (
                <div key={skill.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{skill.name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditing(skill)}
                        className="text-blue-500 hover:text-blue-700 text-sm"
                        disabled={saving}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleDeleteSkill(skill.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                        disabled={saving}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`badge ${
                      skill.category === 'Frontend' ? 'badge-primary' :
                      skill.category === 'Backend' ? 'badge-success' :
                      skill.category === 'Database' ? 'badge-warning' :
                      skill.category === 'DevOps' ? 'badge-error' :
                      'badge-gray'
                    }`}>
                      {skill.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Categories Summary */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">Resumen por Categorías</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {categories.map(category => {
              const count = skills.filter(skill => skill.category === category).length;
              return (
                <div key={category} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-600">{category}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
