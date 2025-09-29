import OpenAI from 'openai';
import { config } from './config';

// Crear cliente OpenAI con manejo de configuration faltante
export function createOpenAIClient() {
  if (!config.openai.isConfigured) {
    return null;
  }
  
  return new OpenAI({
    apiKey: config.openai.apiKey!
  });
}

// Cliente por defecto
export const openai = createOpenAIClient();
