# n8n Environment Variables Configuration

## 🔧 Configuración Requerida para n8n

Copia estas variables a tu instancia de n8n (Settings → Environment Variables):

```bash
# ===========================================
# OPENAI CONFIGURATION
# ===========================================
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-4-vision-preview
OPENAI_MODEL_TEXT=gpt-4

# ===========================================
# GOOGLE DRIVE CONFIGURATION
# ===========================================
GOOGLE_DRIVE_FOLDER_ID=your-google-drive-folder-id
GOOGLE_DRIVE_SERVICE_ACCOUNT_PATH=/path/to/service-account.json

# ===========================================
# MIND TECH APP CONFIGURATION
# ===========================================
MIND_TECH_API_BASE_URL=https://your-app.vercel.app
MIND_TECH_BASIC_AUTH_USER=admin
MIND_TECH_BASIC_AUTH_PASS=your-secure-password

# ===========================================
# WEBHOOK CONFIGURATION
# ===========================================
N8N_WEBHOOK_BASE_URL=https://laucho.app.n8n.cloud/webhook

# ===========================================
# DEVELOPMENT OVERRIDES (Optional)
# ===========================================
# Uncomment for local development:
# MIND_TECH_API_BASE_URL=http://localhost:3001
# N8N_WEBHOOK_BASE_URL=https://laucho.app.n8n.cloud/webhook-test
```

## 🔐 Credentials Necesarios en n8n

### 1. OpenAI API Credential
- **Name**: `OpenAI API`
- **Type**: `OpenAI`
- **API Key**: `sk-your-openai-key-here`

### 2. Google Drive Service Account
- **Name**: `Google Drive Service Account`
- **Type**: `Google Service Account`
- **Service Account JSON**: Upload your service account JSON file

### 3. HTTP Basic Auth
- **Name**: `Mind Tech App Auth`
- **Type**: `HTTP Basic Auth`
- **Username**: `admin`
- **Password**: `your-secure-password`

## 📋 Checklist de Configuración

### ✅ OpenAI Setup
- [ ] API key válida configurada
- [ ] Modelo correcto (gpt-4-vision-preview para CVs)
- [ ] Rate limits configurados apropiadamente

### ✅ Google Drive Setup
- [ ] Service account creado
- [ ] Permisos de lectura en carpeta de CVs
- [ ] JSON file subido a n8n credentials

### ✅ Mind Tech App Setup
- [ ] URL base configurada (producción o desarrollo)
- [ ] Basic Auth credentials configuradas
- [ ] Endpoints accesibles desde n8n

### ✅ Webhook Setup
- [ ] Webhooks activados en n8n
- [ ] URLs de webhook configuradas correctamente
- [ ] Workflows importados y activados

## 🧪 Testing de Configuración

### Test OpenAI Connection
```bash
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer sk-your-openai-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }'
```

### Test Mind Tech App Connection
```bash
curl -X GET https://your-app.vercel.app/api/employees \
  -H "Authorization: Basic $(echo -n 'admin:your-password' | base64)"
```

### Test Webhook Endpoints
```bash
# Test CV processing webhook
curl -X POST https://laucho.app.n8n.cloud/webhook/index-cv \
  -H "Content-Type: application/json" \
  -d '{"test": "connection"}'

# Test matching webhook
curl -X POST https://laucho.app.n8n.cloud/webhook/match-candidates \
  -H "Content-Type: application/json" \
  -d '{"test": "connection"}'
```

## 🔄 Actualización de Configuración

### Para Cambiar de Desarrollo a Producción:
1. Actualiza `MIND_TECH_API_BASE_URL` a la URL de producción
2. Cambia `N8N_WEBHOOK_BASE_URL` de `webhook-test` a `webhook`
3. Verifica que las credentials de producción estén configuradas
4. Testea los endpoints de producción

### Para Cambiar de Producción a Desarrollo:
1. Actualiza `MIND_TECH_API_BASE_URL` a `http://localhost:3001`
2. Cambia `N8N_WEBHOOK_BASE_URL` a `webhook-test`
3. Usa credentials de desarrollo/test
4. Testea los endpoints de desarrollo

## 🚨 Troubleshooting

### Error: "OpenAI API key invalid"
- Verifica que la API key sea válida
- Confirma que tenga créditos disponibles
- Revisa que el modelo esté disponible

### Error: "Google Drive access denied"
- Verifica permisos del service account
- Confirma que la carpeta sea accesible
- Revisa que el JSON del service account sea correcto

### Error: "Mind Tech App authentication failed"
- Verifica Basic Auth credentials
- Confirma que la URL base sea correcta
- Revisa que el endpoint esté accesible

### Error: "Webhook not found"
- Confirma que el workflow esté activado
- Verifica que la URL del webhook sea correcta
- Revisa que n8n esté ejecutándose

---

**Nota**: Reemplaza todos los valores de ejemplo con tus credenciales reales antes de usar en producción.
