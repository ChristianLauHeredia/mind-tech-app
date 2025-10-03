# Features & Funcionalidades 🚀

Documentación detallada de todas las funcionalidades disponibles en Mind Tech Stack.

## 📋 Índice

- [Dashboard Principal](#dashboard-principal)
- [Gestión de Empleados](#gestión-de-empleados)
- [Motor de Matching](#motor-de-matching)
- [Historial de Solicitudes](#historial-de-solicitudes!)
- [Búsqueda Avanzada](#búsqueda-avanzada)
- [Gestión de Skills](#gestión-de-skills)
- [Configuración](#configuración)
- [Analytics & Reporting](#analytics--reporting)

## 🏠 Dashboard Principal

### Overview General
El dashboard proporciona una vista ejecutiva de todos los KPIs del sistema en tiempo real.

#### Métricas Principales
- **Total Empleados**: Contador de empleados activos en el sistema
- **Solicitudes Totales**: Número de búsquedas realizadas
- **Candidatos Sugeridos**: Suma total de candidatos sugeridos por todas las solicitudes
- **Skills Únicos**: Cantidad de habilidades técnicas diferentes identificadas

#### Sección "Skills Más Solicitadas" (Top 5)
```typescript
interface SkillMetric {
  skill: string;    // Nombre de la habilidad
  count: number;    // Número de apariciones
}
```

**Fuente de Datos**: 
- Skills extraídos de `requests.candidates[].match_details.matched_skills`
- Recuento agregado y normalizado (lowercase)

#### Sección "Top Empleados" 
Empleados con nivel SR ordenados por disponibilidad:

```typescript
interface TopEmployee {
  id: string;
  name: string;      // first_name + last_name
  email: string;
  seniority: string;
  location: string;
}
```

#### Actividad Reciente
Timeline de las últimas actividades:
- **Nuevas solicitudes**: Con información de rol y seniority
- **Empleados activos**: Recientemente registrados/modificados

**Formato de tiempo**: `"hace X minutos/horas/días"`

## 👥 Gestión de Empleados

### Lista de Empleados (`/employees`)

#### Campos Mostrados
- **Nombre completo**: First name + Last name  
- **Email**: Contacto principal
- **Seniority**: JR | SSR | SR | STAFF | PRINC
- **Location**: Ubicación geográfica
- **Status**: Activo/Inactivo
- **Acciones**: Edit | Ver Skills | CV Management

#### Paginación y Filtros
```typescript
interface EmployeeListParams {
  limit?: number;     // Default: 20
  offset?: number;    // Default: 0  
  q?: string;         // Search query (nombre/email)
  seniority?: string; // Filter by level
  status?: string;    // Filter by status
}
```

#### Estado Vacío
Cuando no hay empleados: Mensaje motivacional con call-to-action para agregar el primer empleado.

### Formulario de Creación (`/employees/new`)

#### Campos Obligatorios
- **First Name**: Min 2 chars
- **Last Name**: Min 2 chars  
- **Email**: Formato válido + único
- **Seniority**: Dropdown con niveles predefinidos

#### Campos Opcionales
- **Location**: Free text
- **CV URL**: Google Drive link
- **Hire Date**: Date picker
- **Status**: Default "active"

#### Validaciones
- Email único en sistema
- Seniority debe ser valor válido
- CV URL debe tener formato Google Drive válido

### Edición de Empleado (`/employees/[id]/edit`)

#### Funcionalidades
- **Editar datos básicos**: Todos los campos del profile
- **Re-indexar CV**: Botón disponible solo si CV URL está presente
- **Gestión de CV**: Replace CV URL con verificación automática

#### Auto-reindexing
Cuando se actualiza empleado con CV URL:
1. Trigger webhook n8n automático
2. Procesamiento en background  
3. Actualización de `cv_index` table
4. Toast notification de confirmación

### Gestión de Skills (`/employees/[id]/skills`)

#### Visualización
- **Skills Manuales**: De la tabla `employee_skills`
- **Skills Automáticos**: Extraídos de CV por IA
- **Skills Híbridos**: Combinación para matching

#### Operaciones
- **Agregar Skill**: Con nivel de proficiency
- **Editar Skill**: Cambiar nombre o nivel
- **Eliminar Skill**: Con confirmación
- **Reorder**: Drag & drop para priorización

## 🔍 Motor de Matching

### Endpoint Principal: `POST /api/match`

#### Input Structure
```typescript
interface MatchRequest {
  role: string;                              // Required
  seniority: 'JR' | 'SSR' | 'SR' | 'STAFF' | 'PRINC'; // Required
  must_have: string[];                      // Required array
  nice_to_have: string[];                   // Optional
  extra_keywords: string[];                  // Optional context
}
```

#### Algoritmo de Matching

##### Fase 1: Exact Matching
1. **Seniority Matching**: Exacto o ±1 nivel
2. **Skills Intersection**: Al menos 50% de `must_have` debe coincidir
3. **Limit**: Máximo 30 candidatos

##### Fase 2: Relaxation (si 0 resultados)
1. **Seniority Relaxation**: Aceptar ±2 niveles
2. **Skills Relaxation**: Reducir `must_have` en 1 skill mínimo
3. **Fallback Skills**: Usar skills híbridos (manual + automáticos)

##### Scoring Algorithm
```typescript
function calculateScore(candidate: Employee, requirements: MatchRequest): number {
  const {
    seniorityWeight = 0.3,
    skillsWeight = 0.7,
    niceToHaveBonus = 0.1
  } = {};

  const seniorityMatch = getSeniorityScore(candidate.seniority, requirements.seniority);
  const skillsMatch = getSkillsScore(candidate.skills, requirements.must_have);
  const niceToHaveBonus = getBonusScore(candidate.skills, requirements.nice_to_have);

  return (seniorityWeight * seniorityMatch) + 
         (skillsWeight * skillsMatch) + 
         niceToHaveBonus;
}
```

#### Response Structure
```typescript
interface MatchResponse {
  candidates: Candidate[];
  total: number;
  message: string;
}

interface Candidate {
  employee_id: string;
  name: string;
  email: string;
  seniority: string;
  location: string;
  match_score: number;        // 0.0 - 1.0
  summary: string;            // Generated summary
  match_details: {
    role_match: boolean;
    matched_skills: string[];
    seniority_match: boolean;
  };
  cv_index: any;             // Full CV data for analysis
}
```

### GET Support para Testing
```
GET /api/match?role=Developer&seniority=SR&must_have=react,typescript
```
Convierte automáticamente a POST con default values.

## 📊 Historial de Solicitudes

### Página Principal (`/requests`)

#### Tabla de Solicitudes
- **ID**: Identificador único (linkeable)
- **Fecha**: Timestamp formateado  
- **Contenido**: Texto original de búsqueda
- **Candidatos**: Número de matches encontrados
- **Detalle**: Modal con información completa

#### Paginación y Performance
```sql
-- Efficient pagination query
SELECT id, content, parsed_skills, candidates, created_at
FROM requests 
ORDER BY created_at DESC 
LIMIT $limit OFFSET $offset;
```

#### Estado Vacío
Cuando no hay solicitudes: Mensaje informativo con sugerencias de uso.

### Modal de Detalle

#### Información de Solicitud
- **Solicitante**: Quien hizo el request
- **Canal**: web app, slack, etc.
- **Timestamp**: Fecha y hora exacta
- **Contenido Original**: Texto ingresado
- **Skills Parseados**: Estructura extraída por IA

#### Lista de Candidatos
Para cada candidato encontrado:
- **Nombre y Email**: Contacto directo
- **Score**: Porcentaje de match (ej: 85%)
- **Seniority**: Nivel detectado
- **Skills Matcheados**: Lista específica
- **Summary**: Descripción generada por IA

## 🔍 Búsqueda Avanzada

### Página Search Matches (`/search-matches`)

#### Text Input
```typescript
interface TextSearch {
  text: string;           // Required: Descripción del requerimiento
  channel_id: string;     // Default: "web app"
}

// Envio a n8n
POST https://laucho.app.n8n.cloud/webhook/mind-intake
Content-Type: application/json
{
  "text": "need senior react developer for fintech",
  "channel_id": "web app"
}
```

#### File Upload
```typescript
interface FileUpload {
  file: File;             // PDF, DOC, TXT supported
  text?: string;          // Optional context
  channel_id: string;     // Default: "web app"
}

// Envio a n8n
const formData = new FormData();
formData.append('file', selectedFile);
formData.append('text', 'Additional context');
formData.append('channel_id', 'web app');

POST https://laucho.app.n8n.cloud/webhook/mind-intake
Content-Type: multipart/form-data
```

#### Resultados de Búsqueda
Lista de candidatos encontrados ordenados por score:

```typescript
interface SearchResult {
  candidates: Candidate[];
  requestData?: RequestData;  // Saved request if successful
  loading: boolean;
  error?: string;
}
```

### Flujo Completo de Búsqueda

1. **Input Processing**: 
   - Usuario ingresa texto o sube documento
   - Sistema valida input format

2. **n8n Processing**:
   - Envía datos a webhook de n8n  
   - n8n procesa con OpenAI para extraer requerimientos estructurados

3. **Structured Matching**:
   - Para cada resultado de n8n, llama `POST /api/match`
   - Combina resultados de múltiples consultas estructuradas

4. **Result Presentation**:
   - Muestra top 5 candidatos ordenados por score
   - Guarda request en `/api/requests` para historial
   - Permite "Cargar Última Búsqueda" para persistencia

## 🛠️ Gestión de Skills

### Página Skills (`/skills`)

#### Formulario de Creación
```typescript
interface SkillForm {
  name: string;                    // Required, unique
  description: string;             // Optional description
  category: SkillCategory;        // Requred dropdown
}

enum SkillCategory {
  LANGUAGE = 'programming_language',
  FRAMEWORK = 'framework',  
  DATABASE = 'database',
  TOOL = 'tool',
  CLOUD = 'cloud',
  OTHER = 'other'
}
```

#### Lista de Skills
- **Ordenable**: Por nombre, categoría, fecha
- **Búsqueda**: Filtro por texto libre
- **Categorización**: Visual grouping por tipo
- **Count Badge**: Número de empleados que tienen cada skill

#### Acciones Available
- **Edit**: Modificar nombre/descripción
- **Delete**: Con confirmación y cascading
- **Duplicate**: Crear nueva basada en existente

### Integración con Employee Skills

#### Employee-Skills Junction Table
```sql
CREATE TABLE employee_skills (
    employee_id UUID REFERENCES employees(id),
    skill_name VARCHAR REFERENCES skills(name),
    proficiency_level VARCHAR CHECK (...),
    PRIMARY KEY (employee_id, skill_name)
);
```

#### Proficiency Levels
- **Basic**: Nivel inicial, conocimientos fundamentales
- **Intermediate**: Experiencia práctica regular  
- **Advanced**: Domina competencia técnica profunda
- **Expert**: Líder técnico, puede enseñar/mentor

## ⚙️ Configuración

### Settings Page (`/settings`)

#### Application Settings
```typescript
interface AppSettings {
  // Authentication
  basicAuthUser: string;
  basicAuthEnabled: boolean;
  
  // External Integrations  
  n8nWebhookUrl: string;
  n8nTestWebhookUrl: string;
  
  // Matching Configuration
  defaultMatchingLimit: number;
  scoreThreshold: number;
  relaxationEnabled: boolean;
  
  // UI Preferences
  defaultPageSize: number;
  timezone: string;
  language: string;
}
```

#### Configuration Management
- **Save Changes**: Validación y persistencia
- **Test Connections**: Verificar conectividad con servicios externos
- **Reset Defaults**: Restaurar configuración inicial
- **Export/Import**: Backup de configuración

## 📈 Analytics & Reporting

### Dashboard Metrics

#### Employee Analytics
```sql
-- Seniority Distribution
SELECT seniority, COUNT(*) as count
FROM employees 
WHERE status = 'active'
GROUP BY seniority;

-- Top Skill Requests  
SELECT skill, COUNT(*) as request_count
FROM (
  SELECT unnest(candidates) as candidate_data
  FROM requests
) sub,
jsonb_array_elements(candidate_data->'match_details'->'matched_skills') as skill
GROUP BY skill
ORDER BY request_count DESC;
```

#### Request Analytics
```sql
-- Requests by Channel
SELECT parsed_skills->>'channel', COUNT(*) 
FROM requests
GROUP BY parsed_skills->>'channel';

-- Average Candidates per Request
SELECT AVG(jsonb_array_length(candidates)) as avg_candidates
FROM requests
WHERE candidates IS NOT NULL;
```

### Performance Metrics

#### Matching Performance
- **Response Time**: Tiempo de ejecución del algoritmo
- **Match Rate**: Porcentaje de solicitudes con matches  
- **Score Distribution**: Histograma de scores obtenidos
- **Fallback Usage**: Frecuencia de uso de algoritmo de relajación

#### System Health
- **API Response Times**: Por endpoint
- **Database Query Performance**: Por tabla/index
- **External Service Reliability**: n8n webhook success rate
- **Error Rates**: Por módulo de la aplicación

---

Para implementación técnica específica, ver:
- [README Principal](../README.md) - Setup y arquitectura
- [Integración n8n](../docs/N8N_INTEGRATION.md) - Workflow automation
- Comentarios JSDoc en el código de las API routes
