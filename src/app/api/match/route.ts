import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import OpenAI from 'openai';

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

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
    // 1) Validate input with zod
    const body = await req.json();
    const validatedInput: MatchRequest = MatchRequestSchema.parse(body);
    
    const { role, seniority, must_have, nice_to_have = [], withSummary = false } = validatedInput;

    // 2) Normalize skills to lowercase
    const normalizedMustHave = must_have.map(skill => skill.toLowerCase());
    const normalizedNiceToHave = nice_to_have.map(skill => skill.toLowerCase());

    // 3) Single query to get employees with skills and CV links
    const { data: rawData, error } = await sb
      .from('employees')
      .select(`
        id, first_name, last_name, email, position, seniority, location,
        employee_skills!inner(skills(name)),
        cvs(drive_web_view_link)
      `)
      .eq('active', true);

    if (error) {
      console.error('Database error:', error);
      return new Response('Database error', { status: 500 });
    }

    // 4) Group by employee and calculate scores
    const employeeMap = new Map<string, EmployeeWithSkills>();

    rawData?.forEach((emp: any) => {
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

      // Add skill if it exists
      if (emp.employee_skills?.[0]?.skills?.name) {
        const skillName = emp.employee_skills[0].skills.name.toLowerCase();
        const employee = employeeMap.get(emp.id)!;
        if (!employee.skills.includes(skillName)) {
          employee.skills.push(skillName);
        }
      }
    });

    // 5) Calculate scores for each employee
    const candidates: Candidate[] = [];

    for (const employee of employeeMap.values()) {
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

    // 7) Generate summaries if requested
    if (withSummary && topCandidates.length > 0) {
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
      return new Response(`Invalid input: ${error.errors.map(e => e.message).join(', ')}`, { status: 400 });
    }
    
    console.error('Match endpoint error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

/*
Test example:
curl -X POST http://localhost:3000/api/match \
  -H "Content-Type: application/json" \
  -d '{ "role":"Frontend Engineer","seniority":"SR","must_have":["react","typescript"],"nice_to_have":["next.js","tailwind"],"withSummary":false }'
*/
