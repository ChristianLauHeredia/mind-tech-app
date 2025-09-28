import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const validSeniorities = ['JR', 'SSR', 'SR', 'STAFF', 'PRINC'];

// Función para auto-crear skills si no existen
async function ensureSkillsExist(skillNames: string[]): Promise<string[]> {
  if (!skillNames.length) return [];

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/skills/auto-create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        skills: skillNames,
        source: 'csv'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`Auto-created ${result.summary.created} skills from CSV`);
      return skillNames; // Retornar los nombres originales
    }
  } catch (error) {
    console.error('Error auto-creating skills:', error);
  }

  return skillNames;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { csv, operation = 'create' } = body;
    
    if (!csv) {
      return new Response('CSV data is required', { status: 400 });
    }

    const lines = csv.trim().split('\n');
    
    if (lines.length < 2) {
      return new Response('El archivo CSV debe tener al menos una fila de datos (además del header)', { status: 400 });
    }

    const headers = lines[0].split(',').map((h: string) => h.trim());
    const dataRows = lines.slice(1);
    
    let result = '';
    let processedCount = 0;
    let errorCount = 0;

    if (operation === 'create') {
      result = await handleCreateOperation(headers, dataRows);
    } else if (operation === 'update') {
      result = await handleUpdateOperation(headers, dataRows);
    } else if (operation === 'delete') {
      result = await handleDeleteOperation(headers, dataRows);
    } else {
      return new Response('Operación no válida. Use: create, update, o delete', { status: 400 });
    }

    return new Response(result);
    
  } catch (error) {
    return new Response(`Error procesando CSV: ${error}`, { status: 500 });
  }
}

async function handleCreateOperation(headers: string[], dataRows: string[]): Promise<string> {
  const expectedHeaders = ['first_name', 'last_name', 'email', 'position', 'seniority', 'location', 'timezone', 'manager_email'];
  
  // Validar headers básicos
  const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return `Headers faltantes: ${missingHeaders.join(', ')}`;
  }

  const payload = [];
  const errors = [];
  const allSkills = new Set<string>(); // Para recolectar todas las skills

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i].split(',').map(cell => cell.trim());
    const rowNumber = i + 2;
    
    if (row.length < 5) {
      errors.push(`Fila ${rowNumber}: Faltan columnas obligatorias`);
      continue;
    }

    // Mapear datos de la fila
    const rowData: any = {};
    headers.forEach((header, index) => {
      if (row[index]) {
        rowData[header] = row[index];
      }
    });

    const { first_name, last_name, email, position, seniority, location, timezone, manager_email, skills } = rowData;

    // Validaciones
    if (!first_name) errors.push(`Fila ${rowNumber}: first_name es obligatorio`);
    if (!last_name) errors.push(`Fila ${rowNumber}: last_name es obligatorio`);
    if (!email) errors.push(`Fila ${rowNumber}: email es obligatorio`);
    if (!position) errors.push(`Fila ${rowNumber}: position es obligatorio`);
    if (!seniority) errors.push(`Fila ${rowNumber}: seniority es obligatorio`);
    
    if (email && !email.includes('@')) {
      errors.push(`Fila ${rowNumber}: email inválido`);
    }
    
    if (seniority && !validSeniorities.includes(seniority)) {
      errors.push(`Fila ${rowNumber}: seniority debe ser uno de: ${validSeniorities.join(', ')}`);
    }

    if (manager_email && !manager_email.includes('@')) {
      errors.push(`Fila ${rowNumber}: manager_email inválido`);
    }

    // Procesar skills si existen
    if (skills) {
      const skillList = skills.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      skillList.forEach((skill: string) => allSkills.add(skill));
    }

    if (!errors.some(e => e.includes(`Fila ${rowNumber}`))) {
      payload.push({
        first_name,
        last_name,
        email,
        position,
        seniority,
        location: location || null,
        timezone: timezone || null,
        manager_email: manager_email || null,
        skills: skills || null // Guardar skills temporalmente
      });
    }
  }

  if (errors.length > 0) {
    return `Errores encontrados:\n${errors.join('\n')}`;
  }

  if (payload.length === 0) {
    return 'No hay datos válidos para procesar';
  }

  // Auto-crear skills si existen
  let skillsCreated = 0;
  if (allSkills.size > 0) {
    try {
      const skillsArray = Array.from(allSkills);
      await ensureSkillsExist(skillsArray);
      skillsCreated = skillsArray.length;
    } catch (error) {
      console.error('Error creating skills:', error);
    }
  }

  // Remover skills del payload antes de insertar empleados
  const employeePayload = payload.map(({ skills, ...rest }) => rest);

  const { error } = await sb.from('employees').upsert(employeePayload, { onConflict: 'email' });
  
  if (error) {
    return `Error en base de datos: ${error.message}`;
  }

  // Asignar skills a empleados
  let skillsAssigned = 0;
  for (const employee of payload) {
    if (employee.skills) {
      const skillList = employee.skills.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      
      // Obtener el ID del empleado
      const { data: empData } = await sb
        .from('employees')
        .select('id')
        .eq('email', employee.email)
        .single();

      if (empData) {
        // Obtener IDs de las skills
        const { data: skillsData } = await sb
          .from('skills')
          .select('id')
          .in('name', skillList);

        if (skillsData) {
          // Asignar skills al empleado
          const skillAssignments = skillsData.map(skill => ({
            employee_id: empData.id,
            skill_id: skill.id,
            level: 3, // Nivel por defecto
            years: 0
          }));

          await sb.from('employee_skills').upsert(skillAssignments, { 
            onConflict: 'employee_id,skill_id' 
          });
          
          skillsAssigned += skillAssignments.length;
        }
      }
    }
  }

  return `✅ CREADOS exitosamente ${payload.length} empleados\n\n📊 Resumen:\n- Empleados creados: ${payload.length}\n- Skills procesadas: ${skillsCreated}\n- Skills asignadas: ${skillsAssigned}\n- Filas con errores: ${errors.length}\n- Total filas en CSV: ${dataRows.length}`;
}

async function handleUpdateOperation(headers: string[], dataRows: string[]): Promise<string> {
  const errors = [];
  let updatedCount = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i].split(',').map(cell => cell.trim());
    const rowNumber = i + 2;
    
    if (row.length < 2) {
      errors.push(`Fila ${rowNumber}: Faltan columnas mínimas (id/email)`);
      continue;
    }

    const rowData: any = {};
    
    // Mapear datos de la fila
    headers.forEach((header, index) => {
      if (row[index]) {
        rowData[header] = row[index];
      }
    });

    // Validar que tenga id o email
    if (!rowData.id && !rowData.email) {
      errors.push(`Fila ${rowNumber}: Debe tener id o email para actualizar`);
      continue;
    }

    // Validaciones específicas
    if (rowData.email && !rowData.email.includes('@')) {
      errors.push(`Fila ${rowNumber}: email inválido`);
      continue;
    }

    if (rowData.seniority && !validSeniorities.includes(rowData.seniority)) {
      errors.push(`Fila ${rowNumber}: seniority debe ser uno de: ${validSeniorities.join(', ')}`);
      continue;
    }

    if (rowData.manager_email && !rowData.manager_email.includes('@')) {
      errors.push(`Fila ${rowNumber}: manager_email inválido`);
      continue;
    }

    // Convertir active a boolean si existe
    if (rowData.active !== undefined) {
      rowData.active = rowData.active.toLowerCase() === 'true';
    }

    // Remover campos vacíos
    Object.keys(rowData).forEach(key => {
      if (rowData[key] === '' || rowData[key] === null) {
        delete rowData[key];
      }
    });

    try {
      const id = rowData.id;
      const email = rowData.email;
      
      if (id) {
        delete rowData.id; // No actualizar el ID
        const { error } = await sb.from('employees').update(rowData).eq('id', id);
        if (error) throw error;
      } else {
        delete rowData.email; // No actualizar el email
        const { error } = await sb.from('employees').update(rowData).eq('email', email);
        if (error) throw error;
      }

      updatedCount++;
    } catch (error) {
      errors.push(`Fila ${rowNumber}: Error actualizando empleado`);
    }
  }

  let result = `✅ ACTUALIZADOS ${updatedCount} empleados\n\n📊 Resumen:\n- Empleados actualizados: ${updatedCount}\n- Filas con errores: ${errors.length}\n- Total filas en CSV: ${dataRows.length}`;
  
  if (errors.length > 0) {
    result += `\n\n❌ Errores:\n${errors.join('\n')}`;
  }

  return result;
}

async function handleDeleteOperation(headers: string[], dataRows: string[]): Promise<string> {
  const errors = [];
  let deletedCount = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i].split(',').map(cell => cell.trim());
    const rowNumber = i + 2;
    
    if (row.length < 1) {
      errors.push(`Fila ${rowNumber}: Faltan datos`);
      continue;
    }

    const rowData: any = {};
    
    // Mapear datos de la fila
    headers.forEach((header, index) => {
      if (row[index]) {
        rowData[header] = row[index];
      }
    });

    // Validar que tenga id o email
    if (!rowData.id && !rowData.email) {
      errors.push(`Fila ${rowNumber}: Debe tener id o email para eliminar`);
      continue;
    }

    try {
      if (rowData.id) {
        const { error } = await sb.from('employees').delete().eq('id', rowData.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from('employees').delete().eq('email', rowData.email);
        if (error) throw error;
      }
      
      deletedCount++;
    } catch (error) {
      errors.push(`Fila ${rowNumber}: Error eliminando empleado`);
    }
  }

  let result = `✅ ELIMINADOS ${deletedCount} empleados\n\n📊 Resumen:\n- Empleados eliminados: ${deletedCount}\n- Filas con errores: ${errors.length}\n- Total filas en CSV: ${dataRows.length}`;
  
  if (errors.length > 0) {
    result += `\n\n❌ Errores:\n${errors.join('\n')}`;
  }

  return result;
}