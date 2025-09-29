// Configuración centralizada para todos los servicios
export const config = {
  supabase: {
    url: process.env.SUPABASE_URL || null,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
    anonKey: process.env.SUPABASE_ANON_KEY || null,
    get isConfigured() {
      return !!(this.url && this.serviceRoleKey && this.anonKey);
    }
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY || null,
    get isConfigured() {
      return !!(this.apiKey);
    }
  },
  
  auth: {
    basicUser: process.env.BASIC_AUTH_USER || 'admin',
    basicPass: process.env.BASIC_AUTH_PASS || 'password',
    get isConfigured() {
      return !!(this.basicUser && this.basicPass);
    }
  },
  
  app: {
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    get isConfigured() {
      return !!(this.baseUrl);
    }
  }
};
