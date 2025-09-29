# Mind Tech App

Sistema de matching de talento basado en habilidades extraídas de CVs.

## 🚀 Características

- **Dashboard** con métricas del sistema
- **Gestión de empleados** (CRUD completo)
- **Sistema de matching** basado en habilidades de CVs
- **API REST** completa
- **Autenticación básica** integrada
- **Responsive design** para móviles y desktop

## 🛠️ Tecnologías

- **Frontend**: Next.js 14 + React + TypeScript
- **Backend**: Next.js API Routes
- **Database**: Supabase
- **AI**: OpenAI (para summaries opcionales)
- **Styling**: Tailwind CSS

## 📋 Setup

### 1. Instalación
```bash
cd apps/mind-tech-app
npm install
```

### 2. Configuración de Environment Variables

Crea un archivo `.env.local` con:
```bash
# Supabase Configuration (Required)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration (Optional - for AI summaries)
OPENAI_API_KEY=your_openai_api_key

# Authentication
BASIC_AUTH_USER=admin
BASIC_AUTH_PASS=password

# App Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Desarrollo
```bash
npm run dev
```

### 4. Producción
```bash
npm run build
npm start
```

## 🔌 API Endpoints

### Auth
Todos los endpoints requieren autenticación básica.

### Matching
```bash
POST /api/match
Content-Type: application/json

{
  "role": "Senior React Developer",
  "seniority": "SR",
  "must_have": ["react", "typescript"],
  "nice_to_have": ["next.js"],
  "withSummary": true
}
```

### Empleados
- `GET /api/employees` - Listar empleados
- `POST /api/employees` - Crear empleado
- `PUT /api/employees` - Actualizar empleado
- `DELETE /api/employees?id={id}` - Eliminar empleado

### Otros
- `GET /api/requests` - Listar solicitudes
- `GET /api/requests/stats` - Estadísticas de solicitudes

## 🎯 Matching Logic

El sistema extrae habilidades de los CVs indexados y compara con requisitos:

1. **Skills Must-Have**: Peso 70% del score
2. **Skills Nice-to-Have**: Peso 20% del score  
3. **Seniority Match**: Peso 10% del score

## 🚀 Deployment

### Vercel
1. Conecta tu repo a Vercel
2. Configura las environment variables
3. Deploy automático

### Variables requeridas en Vercel:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `OPENAI_API_KEY` (opcional)
- `BASIC_AUTH_USER`
- `BASIC_AUTH_PASS`
- `NEXT_PUBLIC_BASE_URL`

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── api/           # API Routes
│   ├── components/    # Componentes UI
│   ├── employees/     # Páginas empleados
│   ├── requests/      # Páginas solicitudes
│   └── ...
├── lib/
│   └── supabase.ts    # Cliente Supabase
└── middleware.ts       # Autenticación
```

## ✨ Estado Actual

✅ **Sin datos mock** - Solo datos reales de DB  
✅ **Error handling** completo  
✅ **Responsive design**  
✅ **Authentication** básica  
✅ **API REST** funcional  
✅ **Deploy ready** para Vercel  

Ver `CONFIG.md` para detalles de configuración.
