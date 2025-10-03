# n8n Workflows Testing Guide 🧪

Esta guía te ayudará a probar los workflows de n8n de manera sistemática.

## 📋 Prerequisitos

- [ ] n8n instance running
- [ ] Workflows importados y activados
- [ ] Credentials configuradas
- [ ] Environment variables configuradas
- [ ] Mind Tech App desplegada y accesible

## 🔍 Testing del Workflow de Indexación de CVs

### Test 1: CV Processing Básico

**Endpoint**: `POST https://laucho.app.n8n.cloud/webhook/index-cv`

**Payload**:
```json
{
  "employee_id": "test-employee-123",
  "cv_url": "https://docs.google.com/document/d/1RBI3eCwLA-j55Po60MnLbK4MONtTJOJsk_Ue8-ySLZI/edit",
  "action": "extract_cv_data"
}
```

**Expected Response**:
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
    "summary": "Desarrollador con experiencia..."
  }
}
```

**Test Command**:
```bash
curl -X POST https://laucho.app.n8n.cloud/webhook/index-cv \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "test-employee-123",
    "cv_url": "https://docs.google.com/document/d/1RBI3eCwLA-j55Po60MnLbK4MONtTJOJsk_Ue8-ySLZI/edit",
    "action": "extract_cv_data"
  }'
```

### Test 2: Error Handling - Invalid URL

**Payload**:
```json
{
  "employee_id": "test-employee-456",
  "cv_url": "https://invalid-url.com/document.pdf",
  "action": "extract_cv_data"
}
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Failed to access CV document",
  "details": "Unable to download from provided URL"
}
```

### Test 3: Error Handling - Missing Fields

**Payload**:
```json
{
  "employee_id": "test-employee-789"
}
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Missing required fields",
  "details": "cv_url is required"
}
```

## 🔍 Testing del Workflow de Matching de Candidatos

### Test 1: Text Search Básico

**Endpoint**: `POST https://laucho.app.n8n.cloud/webhook/match-candidates`

**Payload**:
```json
{
  "text": "Need a senior React developer with TypeScript experience for a fintech project",
  "channel_id": "web app"
}
```

**Expected Response**:
```json
{
  "success": true,
  "candidates": [
    {
      "employee_id": "uuid-1",
      "name": "Juan Pérez",
      "email": "juan@example.com",
      "seniority": "SR",
      "match_score": 0.85,
      "summary": "Senior developer...",
      "match_details": {
        "matched_skills": ["react", "typescript"],
        "role_match": true,
        "seniority_match": true
      }
    }
  ],
  "total_found": 1,
  "request_id": "req-uuid-123",
  "candidates_count": 1,
  "message": "Found 1 matching candidates"
}
```

**Test Command**:
```bash
curl -X POST https://laucho.app.n8n.cloud/webhook/match-candidates \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Need a senior React developer with TypeScript experience",
    "channel_id": "web app"
  }'
```

### Test 2: File Upload Test

**Endpoint**: `POST https://laucho.app.n8n.cloud/webhook/match-candidates`

**Payload** (multipart/form-data):
```
file: [CV_PDF_FILE]
text: "Looking for experienced Angular developer"
channel_id: "web app"
```

**Test Command**:
```bash
curl -X POST https://laucho.app.n8n.cloud/webhook/match-candidates \
  -F "file=@/path/to/cv.pdf" \
  -F "text=Looking for experienced Angular developer" \
  -F "channel_id=web app"
```

### Test 3: No Matches Found

**Payload**:
```json
{
  "text": "Need a senior Python developer with machine learning experience",
  "channel_id": "web app"
}
```

**Expected Response**:
```json
{
  "success": true,
  "candidates": [],
  "total_found": 0,
  "request_id": "req-uuid-456",
  "candidates_count": 0,
  "message": "No matching candidates found"
}
```

## 🔄 Testing de Integración Completa

### Test End-to-End: CV Upload → Indexing → Matching

1. **Step 1**: Upload CV via Mind Tech App
   ```bash
   curl -X POST https://your-app.vercel.app/api/employees/123/cv \
     -H "Authorization: Basic $(echo -n 'admin:password' | base64)" \
     -H "Content-Type: application/json" \
     -d '{"cv_url": "https://docs.google.com/document/d/your-cv/edit"}'
   ```

2. **Step 2**: Wait for n8n to process (check n8n executions)

3. **Step 3**: Search for candidates
   ```bash
   curl -X POST https://laucho.app.n8n.cloud/webhook/match-candidates \
     -H "Content-Type: application/json" \
     -d '{
       "text": "Need a developer with skills from the uploaded CV",
       "channel_id": "web app"
     }'
   ```

4. **Step 4**: Verify results in Mind Tech App
   ```bash
   curl -X GET https://your-app.vercel.app/api/requests \
     -H "Authorization: Basic $(echo -n 'admin:password' | base64)"
   ```

## 📊 Monitoring y Debugging

### n8n Execution Monitoring

1. **Go to**: n8n → Executions
2. **Filter by**: Workflow name or webhook
3. **Check**: Execution status, duration, errors
4. **Review**: Node logs for debugging

### Common Issues and Solutions

#### Issue: "OpenAI API rate limit exceeded"
**Solution**: 
- Wait for rate limit reset
- Reduce request frequency
- Upgrade OpenAI plan if needed

#### Issue: "Google Drive access denied"
**Solution**:
- Verify service account permissions
- Check folder sharing settings
- Confirm service account JSON is valid

#### Issue: "Mind Tech App authentication failed"
**Solution**:
- Verify Basic Auth credentials
- Check API base URL
- Confirm endpoint is accessible

#### Issue: "No candidates found"
**Solution**:
- Check if employees have CVs indexed
- Verify skills matching logic
- Test with different search terms

## 🎯 Performance Testing

### Load Testing

**Test concurrent requests**:
```bash
# Test 10 concurrent CV processing requests
for i in {1..10}; do
  curl -X POST https://laucho.app.n8n.cloud/webhook/index-cv \
    -H "Content-Type: application/json" \
    -d "{\"employee_id\": \"test-$i\", \"cv_url\": \"https://docs.google.com/document/d/your-cv/edit\"}" &
done
wait
```

**Test response times**:
```bash
# Measure response time
time curl -X POST https://laucho.app.n8n.cloud/webhook/match-candidates \
  -H "Content-Type: application/json" \
  -d '{"text": "senior developer", "channel_id": "web app"}'
```

### Expected Performance Metrics

- **CV Processing**: < 30 seconds per CV
- **Candidate Matching**: < 5 seconds per search
- **API Response**: < 2 seconds for simple requests
- **Concurrent Handling**: 10+ requests simultaneously

## ✅ Testing Checklist

### Pre-Production Testing
- [ ] All workflows import successfully
- [ ] Credentials are configured correctly
- [ ] Environment variables are set
- [ ] Basic functionality works
- [ ] Error handling works
- [ ] Performance meets requirements
- [ ] Integration with Mind Tech App works
- [ ] Monitoring and logging work

### Production Testing
- [ ] Production URLs are configured
- [ ] Production credentials are set
- [ ] Rate limits are appropriate
- [ ] Error handling is robust
- [ ] Performance is acceptable
- [ ] Monitoring is in place
- [ ] Backup procedures are ready

---

**Nota**: Siempre prueba en un entorno de desarrollo antes de usar en producción.
