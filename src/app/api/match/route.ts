import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import OpenAI from 'openai';

// Input validation schema
const MatchRequestSchema = z.object({
  role: z.string().min(1),
  seniority: z.enum(['JR', 'SSR', 'SR', 'STAFF', 'PRINC']),
  must_have: z.array(z.string()).min(1, 'must_have cannot be empty'),
  nice_to_have: z.array(z.string()).optional(),
  withSummary: z.boolean().optional().default(false)
});

type MatchRequest = z.infer<typeof MatchRequestSchema>;

interface EmployeeWithSkills {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  seniority: string;
  location: string | null;
  cv_link: string | null;
  skills: string[];
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  position: string;
  seniority: string;
  location?: string;
  cvLink?: string;
  score: number;
  summary?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Validar configuración requerida
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json({ 
        error: 'Database not configured. Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.' 
      }, { status: 500 });
    }

    // 1) Validate input with zod
    const body = await req.json();
    const validatedInput: MatchRequest = MatchRequestSchema.parse(body);
    
    const { role, seniority, must_have, nice_to_have = [], withSummary = false } = validatedInput;

    // 2) Normalize skills to lowercase
    const normalizedMustHave = must_have.map(skill => skill.toLowerCase());
    const normalizedNiceToHave = nice_to_have.map(skill => skill.toLowerCase());

    // 3) Query database para obtener empleados con CVs
    const sb = createClient(
      process.env.SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY || undefined 
    });

    const result = await sb
      .from('employees')
      .select(`
        id, first_name, last_name, email, position, seniority, location,
        cv_index(plain_text),
        cvs(drive_web_view_link)
      `)
      .eq('active', true)
      .not('cv_index.plain_text', 'is', null);

    if (result.error) {
      console.error('Database query error:', result.error);
      return Response.json({ error: 'Database query failed' }, { status: 500 });
    }

    const rawData = result.data || [];
    if (rawData.length === 0) {
      return Response.json({ candidates: [] });
    }

    // 4) Extract skills from CV text and group by employee
    const employeeMap = new Map<string, EmployeeWithSkills>();

    rawData.forEach((emp: any) => {
      if (!employeeMap.has(emp.id)) {
        employeeMap.set(emp.id, {
          id: emp.id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          email: emp.email,
          position: emp.position,
          seniority: emp.seniority,
          location: emp.location,
          cv_link: emp.cvs?.[0]?.drive_web_view_link || null,
          skills: []
        });
      }

      // Extract skills from CV text
      if (emp.cv_index?.plain_text) {
        const cvText = emp.cv_index.plain_text.toLowerCase();
        const employee = employeeMap.get(emp.id)!;
        
        // Common tech skills to look for in CV
        const techSkills = [
          'react', 'vue', 'angular', 'javascript', 'typescript', 'node.js', 'next.js',
          'python', 'django', 'flask', 'fastapi', 'java', 'spring', 'c#', '.net',
          'php', 'laravel', 'ruby', 'rails', 'go', 'rust', 'express',
          'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'sqlite',
          'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform', 'ansible',
          'jenkins', 'gitlab ci', 'github actions', 'nginx', 'apache',
          'react native', 'flutter', 'ios', 'android', 'swift', 'kotlin',
          'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy',
          'figma', 'sketch', 'adobe', 'photoshop', 'illustrator',
          'jest', 'cypress', 'selenium', 'testing', 'unit test', 'integration test',
          'html', 'css', 'sass', 'scss', 'tailwind', 'bootstrap', 'jquery',
          'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence',
          'agile', 'scrum', 'kanban', 'ci/cd', 'devops', 'microservices',
          'rest api', 'graphql', 'websocket', 'oauth', 'jwt', 'firebase',
          'supabase', 'vercel', 'netlify', 'heroku', 'digital ocean'
        ];

        // Extract skills found in CV text
        techSkills.forEach(skill => {
          if (cvText.includes(skill) && !employee.skills.includes(skill)) {
            employee.skills.push(skill);
          }
        });
      }
    });

    // 5) Calculate scores for each employee
    const candidates: Candidate[] = [];

    for (const employee of Array.from(employeeMap.values())) {
      const matchMust = employee.skills.filter(skill => 
        normalizedMustHave.includes(skill)
      ).length;
      
      const matchNice = employee.skills.filter(skill => 
        normalizedNiceToHave.includes(skill)
      ).length;

      const seniorityMatch = employee.seniority === seniority;
      const totalMust = normalizedMustHave.length;
      const totalNice = normalizedNiceToHave.length;

      // Calculate score
      const score = (matchMust / totalMust) * 0.7 +
                   (totalNice ? (matchNice / totalNice) * 0.2 : 0) +
                   (seniorityMatch ? 0.1 : 0);

      // Only include candidates with at least one must_have match
      if (matchMust > 0) {
        candidates.push({
          id: employee.id,
          name: `${employee.first_name} ${employee.last_name}`,
          email: employee.email,
          position: employee.position,
          seniority: employee.seniority,
          location: employee.location || undefined,
          cvLink: employee.cv_link || undefined,
          score: Math.round(score * 100) / 100 // Round to 2 decimal places
        });
      }
    }

    // 6) Sort by score DESC and take top 5
    candidates.sort((a, b) => b.score - a.score);
    const topCandidates = candidates.slice(0, 5);

    // 7) Generate summaries if requested and OpenAI is available
    if (withSummary && topCandidates.length > 0 && process.env.OPENAI_API_KEY) {
      try {
        const summaries = await Promise.all(
          topCandidates.map(async (candidate) => {
            try {
              const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                temperature: 0.3,
                messages: [
                  {
                    role: 'system',
                    content: 'Resume en 2–3 líneas por qué este candidato es fit para el rol. Usa sus skills coincidentes y evita inventar datos.'
                  },
                  {
                    role: 'user',
                    content: `Candidato: ${candidate.name} (${candidate.position}, ${candidate.seniority}). Rol buscado: ${role} (${seniority}). Skills del candidato: ${employeeMap.get(candidate.id)?.skills.join(', ') || 'N/A'}. Skills requeridos: ${must_have.join(', ')}.`
                  }
                ],
                max_tokens: 150
              });

              return completion.choices[0].message.content || '';
            } catch (error) {
              console.error('OpenAI error for candidate:', candidate.name, error);
              return '';
            }
          })
        );

        // Attach summaries to candidates
        topCandidates.forEach((candidate, index) => {
          if (summaries[index]) {
            candidate.summary = summaries[index];
          }
        });
      } catch (error) {
        console.error('Error generating summaries:', error);
        // Continue without summaries if OpenAI fails
      }
    }

    // 8) Return clean JSON
    return Response.json({ candidates: topCandidates });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ 
        error: `Invalid input: ${error.errors.map(e => e.message).join(', ')}` 
      }, { status: 400 });
    }
    
    console.error('Match endpoint error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/*
Test example:
curl -X POST http://localhost:3000/api/match \
  -H "Content-Type: application/json" \
  -d '{ "role":"Frontend Engineer","seniority":"SR","must_have":["react","typescript"],"nice_to_have":["next.js","tailwind"],"withSummary":false }'
*/