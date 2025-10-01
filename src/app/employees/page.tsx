'use client';
import { useState, useEffect } from 'react';

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
  created_at: string;
  updated_at: string;
}

interface CV {
  employee_id: string;
  url: string;
  updated_at: string;
}

interface EmployeeSkills {
  employee_id: string;
  skill_name: string;
  proficiency_level: number;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeSkills, setEmployeeSkills] = useState<EmployeeSkills[]>([]);
  const [cvs, setCvs] = useState<CV[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [seniorityFilter, setSeniorityFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Advanced filters
  const [managerFilter, setManagerFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeSkills = async () => {
    try {
      const response = await fetch('/api/employees/skills');
      const data = await response.json();
      setEmployeeSkills(data);
    } catch (error) {
      console.error('Error fetching employee skills:', error);
    }
  };

  const fetchCVs = async () => {
    try {
      const response = await fetch('/api/employees/cvs');
      const data = await response.json();
      setCvs(data);
    } catch (error) {
      console.error('Error fetching CVs:', error);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([
      fetchEmployees(),
      fetchEmployeeSkills(),
      fetchCVs()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este empleado?')) {
      try {
        await fetch(`/api/employees/${id}`, { method: 'DELETE' });
        fetchEmployees(); // Refresh the list
        fetchEmployeeSkills(); // Refresh skills
      } catch (error) {
        console.error('Error deleting employee:', error);
      }
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setPositionFilter('');
    setSeniorityFilter('');
    setLocationFilter('');
    setSkillFilter('');
    setManagerFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setActiveFilter('');
  };

  const exportToCSV = () => {
    const headers = ['first_name', 'last_name', 'email', 'position', 'seniority', 'location', 'timezone', 'manager_email', 'cv_url', 'active', 'skills'];
    
    const csvContent = [
      headers.join(','),
      ...filteredEmployees.map(emp => {
        const skills = getEmployeeSkills(emp.id);
        const cv = getEmployeeCV(emp.id);
        const skillsText = skills.map(s => `${s.skill_name}(${s.proficiency_level})`).join(';');
        
        return [
          emp.first_name,
          emp.last_name,
          emp.email,
          emp.position,
          emp.seniority,
          emp.location || '',
          emp.timezone || '',
          emp.manager_email || '',
          cv?.url || '',
          emp.active ? 'true' : 'false',
          skillsText
        ].map(field => `"${field}"`).join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `employees_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getEmployeeSkills = (employeeId: string) => {
    return employeeSkills.filter(skill => skill.employee_id === employeeId);
  };

  const getEmployeeCV = (employeeId: string) => {
    return cvs.find(cv => cv.employee_id === employeeId);
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = !searchQuery || 
      emp.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPosition = !positionFilter || 
      emp.position.toLowerCase().includes(positionFilter.toLowerCase());
    
    const matchesSeniority = !seniorityFilter || 
      emp.seniority === seniorityFilter;
    
    const matchesLocation = !locationFilter || 
      (emp.location && emp.location.toLowerCase().includes(locationFilter.toLowerCase()));
    
    const matchesSkill = !skillFilter || 
      getEmployeeSkills(emp.id).some(skill => 
        skill.skill_name.toLowerCase().includes(skillFilter.toLowerCase())
      );
    
    const matchesManager = !managerFilter || 
      (emp.manager_email && emp.manager_email.toLowerCase().includes(managerFilter.toLowerCase()));
    
    const matchesActive = !activeFilter || 
      (activeFilter === 'active' && emp.active) ||
      (activeFilter === 'inactive' && !emp.active);
    
    const matchesDateFrom = !dateFromFilter || 
      new Date(emp.created_at) >= new Date(dateFromFilter);
    
    const matchesDateTo = !dateToFilter || 
      new Date(emp.created_at) <= new Date(dateToFilter);
    
    return matchesSearch && matchesPosition && matchesSeniority && matchesLocation && 
           matchesSkill && matchesManager && matchesActive && matchesDateFrom && matchesDateTo;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, positionFilter, seniorityFilter, locationFilter, skillFilter, managerFilter, dateFromFilter, dateToFilter, activeFilter]);

  const uniquePositions = Array.from(new Set(employees.map(emp => emp.position)));
  const uniqueSeniorities = Array.from(new Set(employees.map(emp => emp.seniority)));
  const uniqueLocations = Array.from(new Set(employees.map(emp => emp.location).filter(Boolean)));
  const uniqueSkills = Array.from(new Set(employeeSkills.map(skill => skill.skill_name)));

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="spinner w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando empleados...</p>
      </div>
    </div>
  );
  
  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Gestión de Empleados</h1>
          <p className="text-gray-600 mt-2 text-sm lg:text-base">
            Mostrando {startIndex + 1}-{Math.min(endIndex, filteredEmployees.length)} de {filteredEmployees.length} empleados
            {filteredEmployees.length !== employees.length && ` (${employees.length} total)`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={refreshData}
            disabled={loading}
            className="btn btn-secondary text-sm"
          >
            {loading ? '⏳ Actualizando...' : '🔄 Actualizar'}
          </button>
          <button onClick={exportToCSV} className="btn btn-secondary text-sm">
            📤 Exportar CSV
          </button>
          <a href="/employees/upload" className="btn btn-secondary text-sm">
            📁 Cargar CSV
          </a>
          <a href="/employees/new" className="btn btn-primary text-sm">
            ➕ Nuevo Empleado
          </a>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input" 
                placeholder="Buscar por nombre, apellido o email..." 
              />
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="btn btn-secondary text-sm"
              >
                🔍 Filtros {showFilters ? '▲' : '▼'}
              </button>
              {(searchQuery || positionFilter || seniorityFilter || locationFilter || skillFilter || managerFilter || dateFromFilter || dateToFilter || activeFilter) && (
                <button onClick={resetFilters} className="btn btn-secondary text-sm">
                  🗑️ Limpiar
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="space-y-6 pt-4 border-t border-gray-200">
              {/* Basic Filters */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros Básicos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="form-label">Posición</label>
                    <select 
                      value={positionFilter} 
                      onChange={(e) => setPositionFilter(e.target.value)}
                      className="form-input"
                    >
                      <option value="">Todas las posiciones</option>
                      {uniquePositions.map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="form-label">Seniority</label>
                    <select 
                      value={seniorityFilter} 
                      onChange={(e) => setSeniorityFilter(e.target.value)}
                      className="form-input"
                    >
                      <option value="">Todos los niveles</option>
                      {uniqueSeniorities.map(sen => (
                        <option key={sen} value={sen}>{sen}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="form-label">Ubicación</label>
                    <select 
                      value={locationFilter} 
                      onChange={(e) => setLocationFilter(e.target.value)}
                      className="form-input"
                    >
                      <option value="">Todas las ubicaciones</option>
                      {uniqueLocations.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="form-label">Skill</label>
                    <select 
                      value={skillFilter} 
                      onChange={(e) => setSkillFilter(e.target.value)}
                      className="form-input"
                    >
                      <option value="">Todas las skills</option>
                      {uniqueSkills.map(skill => (
                        <option key={skill} value={skill}>{skill}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Advanced Filters */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros Avanzados</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="form-label">Manager Email</label>
                    <input
                      type="email"
                      value={managerFilter}
                      onChange={(e) => setManagerFilter(e.target.value)}
                      className="form-input"
                      placeholder="manager@company.com"
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Estado</label>
                    <select 
                      value={activeFilter} 
                      onChange={(e) => setActiveFilter(e.target.value)}
                      className="form-input"
                    >
                      <option value="">Todos los estados</option>
                      <option value="active">Activos</option>
                      <option value="inactive">Inactivos</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="form-label">Fecha Desde</label>
                    <input
                      type="date"
                      value={dateFromFilter}
                      onChange={(e) => setDateFromFilter(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Fecha Hasta</label>
                    <input
                      type="date"
                      value={dateToFilter}
                      onChange={(e) => setDateToFilter(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Employees Table */}
      <div className="card">
        <div className="card-body p-0">
          {/* Contenedor scrollable */}
          <div style={{ width: '100%', overflowX: 'auto', border: '1px solid #e5e7eb' }}>
            <table style={{ minWidth: '1200px', width: '100%' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4 font-semibold text-gray-900 whitespace-nowrap">Empleado</th>
                  <th className="text-left p-4 font-semibold text-gray-900 whitespace-nowrap">Posición</th>
                  <th className="text-left p-4 font-semibold text-gray-900 whitespace-nowrap">Seniority</th>
                  <th className="text-left p-4 font-semibold text-gray-900 whitespace-nowrap">Ubicación</th>
                  <th className="text-left p-4 font-semibold text-gray-900 whitespace-nowrap">CV</th>
                  <th className="text-left p-4 font-semibold text-gray-900 whitespace-nowrap">Skills</th>
                  <th className="text-left p-4 font-semibold text-gray-900 whitespace-nowrap">Estado</th>
                  <th className="text-left p-4 font-semibold text-gray-900 whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedEmployees.map((emp) => {
                  const skills = getEmployeeSkills(emp.id);
                  const cv = getEmployeeCV(emp.id);
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="p-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{emp.email}</div>
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{emp.position}</span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`badge ${
                          emp.seniority === 'JR' ? 'badge-warning' :
                          emp.seniority === 'SSR' ? 'badge-primary' :
                          emp.seniority === 'SR' ? 'badge-success' :
                          emp.seniority === 'STAFF' ? 'badge-error' :
                          'badge-gray'
                        }`}>
                          {emp.seniority}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="text-gray-900">{emp.location || 'N/A'}</span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {cv ? (
                          <a 
                            href={cv.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          >
                            📄 Ver CV
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">Sin CV</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {skills.slice(0, 3).map((skill, idx) => (
                            <span key={idx} className="badge badge-gray text-xs">
                              {skill.skill_name}
                            </span>
                          ))}
                          {skills.length > 3 && (
                            <span className="badge badge-gray text-xs">
                              +{skills.length - 3} más
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`badge ${emp.active ? 'badge-success' : 'badge-error'}`}>
                          {emp.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex gap-1">
                          <a 
                            href={`/employees/${emp.id}/skills`} 
                            className="btn btn-sm btn-secondary text-xs"
                          >
                            🎯
                          </a>
                          <a 
                            href={`/employees/${emp.id}/edit`} 
                            className="btn btn-sm btn-secondary text-xs"
                          >
                            ✏️
                          </a>
                          <button 
                            onClick={() => handleDelete(emp.id)}
                            className="btn btn-sm btn-secondary text-red-600 hover:bg-red-50 text-xs"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {filteredEmployees.length > itemsPerPage && (
            <div className="card-footer">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="form-label mb-0 text-sm">Mostrar:</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="form-input w-20 text-sm"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  <span className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="btn btn-sm btn-secondary text-xs"
                    >
                      ← Anterior
                    </button>
                    
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 2, currentPage - 1)) + i;
                        if (pageNum > totalPages) return null;
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`btn btn-sm text-xs ${
                              pageNum === currentPage ? 'btn-primary' : 'btn-secondary'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="btn btn-sm btn-secondary text-xs"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron empleados</h3>
              <p className="text-gray-500 mb-4">
                {employees.length === 0 
                  ? 'No hay empleados registrados. Agrega el primero.'
                  : 'Intenta ajustar los filtros de búsqueda.'
                }
              </p>
              {employees.length === 0 && (
                <a href="/employees/new" className="btn btn-primary">
                  ➕ Agregar Primer Empleado
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
);
}