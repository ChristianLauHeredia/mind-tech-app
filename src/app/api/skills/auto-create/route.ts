import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Función para categorizar automáticamente una skill
function categorizeSkill(skillName: string): string {
  const skill = skillName.toLowerCase();
  
  // Frontend
  if (['react', 'vue', 'angular', 'javascript', 'typescript', 'html', 'css', 'sass', 'scss', 'tailwind', 'bootstrap', 'jquery', 'next.js', 'nuxt.js', 'svelte'].includes(skill)) {
    return 'Frontend';
  }
  
  // Backend
  if (['node.js', 'python', 'django', 'flask', 'fastapi', 'java', 'spring', 'c#', '.net', 'php', 'laravel', 'symfony', 'ruby', 'rails', 'go', 'rust', 'express'].includes(skill)) {
    return 'Backend';
  }
  
  // Database
  if (['postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'sqlite', 'oracle', 'sql server', 'cassandra', 'dynamodb', 'neo4j'].includes(skill)) {
    return 'Database';
  }
  
  // DevOps
  if (['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform', 'ansible', 'jenkins', 'gitlab ci', 'github actions', 'nginx', 'apache'].includes(skill)) {
    return 'DevOps';
  }
  
  // Mobile
  if (['react native', 'flutter', 'ios', 'android', 'swift', 'kotlin', 'xamarin', 'ionic', 'cordova'].includes(skill)) {
    return 'Mobile';
  }
  
  // AI/ML
  if (['tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy', 'opencv', 'nlp', 'machine learning', 'deep learning', 'ai'].includes(skill)) {
    return 'AI/ML';
  }
  
  // Design
  if (['figma', 'sketch', 'adobe', 'photoshop', 'illustrator', 'ui', 'ux', 'design', 'prototyping'].includes(skill)) {
    return 'Design';
  }
  
  // Testing
  if (['jest', 'cypress', 'selenium', 'testing', 'unit test', 'integration test', 'e2e', 'jasmine', 'mocha'].includes(skill)) {
    return 'Testing';
  }
  
  // Automation
  if (['n8n', 'zapier', 'automation', 'workflow', 'rpa', 'process automation'].includes(skill)) {
    return 'Automation';
  }
  
  return 'General';
}

// Función para normalizar nombres de skills
function normalizeSkillName(skillName: string): string {
  return skillName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s.-]/g, '') // Remover caracteres especiales excepto espacios, puntos y guiones
    .replace(/\s+/g, ' ') // Normalizar espacios
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalizar cada palabra
    .join(' ');
}

// POST - Auto-crear skills desde una lista
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { skills, source = 'unknown' } = body; // source puede ser 'csv', 'cv', 'manual'
    
    if (!skills || !Array.isArray(skills)) {
      return new Response('skills array is required', { status: 400 });
    }

    const results = {
      created: [] as any[],
      existing: [] as any[],
      errors: [] as string[]
    };

    for (const skillName of skills) {
      if (!skillName || typeof skillName !== 'string') {
        results.errors.push(`Invalid skill name: ${skillName}`);
        continue;
      }

      const normalizedName = normalizeSkillName(skillName);
      const category = categorizeSkill(normalizedName);

      try {
        // Verificar si la skill ya existe
        const { data: existingSkill } = await sb
          .from('skills')
          .select('*')
          .eq('name', normalizedName)
          .single();

        if (existingSkill) {
          results.existing.push({
            name: normalizedName,
            category: existingSkill.category,
            id: existingSkill.id
          });
        } else {
          // Crear nueva skill
          const { data: newSkill, error } = await sb
            .from('skills')
            .insert({
              name: normalizedName,
              category: category
            })
            .select('*')
            .single();

          if (error) {
            results.errors.push(`Error creating skill ${normalizedName}: ${error.message}`);
          } else {
            results.created.push({
              name: normalizedName,
              category: category,
              id: newSkill.id,
              source: source
            });
          }
        }
      } catch (error) {
        results.errors.push(`Error processing skill ${skillName}: ${error}`);
      }
    }

    return Response.json({
      success: true,
      summary: {
        total: skills.length,
        created: results.created.length,
        existing: results.existing.length,
        errors: results.errors.length
      },
      details: results
    });

  } catch (error) {
    console.error('Request error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// GET - Obtener sugerencias de skills basadas en texto
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text');
    
    if (!text) {
      return new Response('text parameter is required', { status: 400 });
    }

    // Extraer posibles skills del texto usando palabras clave comunes
    const skillKeywords = [
      'react', 'vue', 'angular', 'javascript', 'typescript', 'python', 'java', 'node.js',
      'postgresql', 'mysql', 'mongodb', 'docker', 'kubernetes', 'aws', 'azure',
      'react native', 'flutter', 'ios', 'android', 'figma', 'sketch',
      'tensorflow', 'pytorch', 'machine learning', 'ai', 'ml',
      'jest', 'cypress', 'testing', 'selenium', 'n8n', 'automation'
    ];

    const foundSkills = skillKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );

    const suggestions = foundSkills.map(skill => ({
      name: skill,
      category: categorizeSkill(skill),
      confidence: 'high'
    }));

    return Response.json({
      suggestions,
      count: suggestions.length
    });

  } catch (error) {
    console.error('Request error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
