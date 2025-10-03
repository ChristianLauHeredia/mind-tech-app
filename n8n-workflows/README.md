# n8n Workflows para Mind Tech Stack 🤖

Esta carpeta contiene los workflows de n8n necesarios para el funcionamiento completo del sistema Mind Tech Stack.

## 📋 Workflows Disponibles

### 1. **index-cv-workflow.json**
**Propósito**: Procesamiento automático de CVs

**Endpoint**: `https://laucho.app.n8n.cloud/webhook/index-cv`

**Funcionalidad**:
- Recibe `employee_id` y `cv_url` desde la web app
- Descarga el CV desde Google Drive
- Extrae texto usando OpenAI Vision API
- Procesa y estructura la información del CV
- Envía datos estructurados de vuelta a `/api/cv-index-simple`

**Input**:
```json
{
  "employee_id": "uuid",
  "cv_url": "https://docs.google.com/document/...",
  "action": "extract_cv_data"
}
```

**Output**:
```json
{
  "success": true,
  "cv_data": {
    "role": "Senior Frontend Developer",
    "seniority": "SR",
    "skills": ["react", "typescript", "next.js"],
    "keywords": ["leadership", "mentorship"],
    "last_project": "E-commerce platform",
    "location": "Buenos Aires, Argentina",
    "summary": "Desarrollador con 6+ años de experiencia..."
  }
}
```

### 2. **match-candidates-workflow.json** (Próximamente)
**Propósito**: Búsqueda y matching de candidatos

**Endpoint**: `https://laucho.app.n8n.cloud/webhook/match-candidates`

**Funcionalidad**:
- Recibe texto libre o archivos CV desde la web app
- Procesa con OpenAI para extraer requerimientos estructurados
- Llama al motor de matching `/api/match`
- Guarda resultados en `/api/requests`
- Devuelve candidatos encontrados

## 🚀 Cómo Importar Workflows

### Método 1: Importación Directa en n8n
1. Abre tu instancia de n8n
2. Ve a **Workflows** → **Import from File**
3. Selecciona el archivo JSON correspondiente
4. El workflow se importará automáticamente

### Método 2: Importación Manual
1. Copia el contenido del archivo JSON
2. En n8n, ve a **Workflows** → **Import from Clipboard**
3. Pega el contenido JSON
4. Haz clic en **Import**

### Método 3: Importación desde URL
1. En n8n, ve a **Workflows** → **Import from URL**
2. Usa la URL del archivo JSON (si está en un repo público)

## ⚙️ Configuración Requerida

### Credentials Necesarios en n8n

#### 1. **OpenAI API**
- **Tipo**: Bearer Token
- **Token**: `sk-your-openai-key`
- **Modelo**: `gpt-4-vision-preview` (para CVs) o `gpt-4` (para texto)

#### 2. **Google Drive Service Account**
- **Tipo**: Service Account JSON
- **Archivo**: Service account credentials JSON
- **Permisos**: Read access a la carpeta de CVs

#### 3. **HTTP Request Authentication**
- **Tipo**: Basic Auth
- **Username**: `BASIC_AUTH_USER` (desde env vars)
- **Password**: `BASIC_AUTH_PASS` (desde env vars)

### Environment Variables en n8n

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4-vision-preview

# Google Drive Configuration  
GOOGLE_DRIVE_FOLDER_ID=your-shared-folder-id
GOOGLE_DRIVE_SERVICE_ACCOUNT_PATH=/path/to/service-account.json

# Mind Tech App Configuration
MIND_TECH_API_BASE_URL=https://your-app.vercel.app
MIND_TECH_BASIC_AUTH_USER=admin
MIND_TECH_BASIC_AUTH_PASS=secure-password

# Webhook URLs
N8N_WEBHOOK_BASE_URL=https://laucho.app.n8n.cloud/webhook
```

## 🔧 Configuración de Webhooks

### Para Desarrollo Local
```bash
# URLs de test
INDEX_CV_WEBHOOK=https://laucho.app.n8n.cloud/webhook-test/index-cv
MATCH_CANDIDATES_WEBHOOK=https://laucho.app.n8n.cloud/webhook-test/match-candidates
```

### Para Producción
```bash
# URLs de producción
INDEX_CV_WEBHOOK=https://laucho.app.n8n.cloud/webhook/index-cv
MATCH_CANDIDATES_WEBHOOK=https://laucho.app.n8n.cloud/webhook/match-candidates
```

## 🧪 Testing de Workflows

### Test CV Processing
```bash
curl -X POST https://laucho.app.n8n.cloud/webhook/index-cv \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "test-uuid-123",
    "cv_url": "https://docs.google.com/document/d/your-cv/edit",
    "action": "extract_cv_data"
  }'
```

### Test Candidate Matching
```bash
curl -X POST https://laucho.app.n8n.cloud/webhook/match-candidates \
  -H "Content-Type: application/json" \
  -d '{
    "text": "need senior react developer for fintech project",
    "channel_id": "web app"
  }'
```

## 📊 Monitoreo y Debugging

### Logs de Ejecución
- Ve a **Executions** en n8n para ver el historial
- Filtra por webhook name para encontrar ejecuciones específicas
- Revisa los logs de cada nodo para debugging

### Errores Comunes
1. **Authentication Errors**: Verificar Basic Auth credentials
2. **Google Drive Access**: Confirmar permisos del service account
3. **OpenAI Rate Limits**: Revisar límites de API
4. **Webhook Timeouts**: Ajustar timeout settings en n8n

## 🔄 Actualizaciones

Cuando se actualicen los workflows:
1. Exporta la nueva versión desde n8n
2. Reemplaza el archivo JSON correspondiente
3. Actualiza esta documentación si hay cambios
4. Notifica al equipo sobre los cambios

## 📞 Soporte

Para problemas con workflows:
1. Revisa los logs de ejecución en n8n
2. Verifica las credentials y environment variables
3. Consulta la documentación principal del proyecto
4. Contacta al equipo de desarrollo

---

**Última actualización**: $(date)
**Versión**: 1.0.0
