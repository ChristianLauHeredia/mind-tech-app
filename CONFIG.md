# Configuration Guide

## Required Environment Variables

Create a `.env.local` file in the `apps/mind-tech-app` directory with the following variables:

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

## For Vercel Deployment

Configure these environment variables in your Vercel dashboard:

1. `SUPABASE_URL`
2. `SUPABASE_SERVICE_ROLE_KEY` 
3. `SUPABASE_ANON_KEY`
4. `OPENAI_API_KEY` (optional)
5. `BASIC_AUTH_USER`
6. `BASIC_AUTH_PASS`
7. `NEXT_PUBLIC_BASE_URL`

## Running Locally

```bash
cd apps/mind-tech-app
npm install
npm run dev
```
