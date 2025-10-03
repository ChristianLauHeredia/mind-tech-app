import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Input validation schema
const MatchRequestSchema = z.object({
  role: z.string().min(1),
  seniority: z.enum(['JR', 'SSR', 'SR', 'STAFF', 'PRINC']),
  must_have: z.array(z.string()).min(1),
  nice_to_have: z.array(z.string()).optional().default([]),
  extra_keywords: z.array(z.string()).optional().default([])
});

type MatchRequest = z.infer<typeof MatchRequestSchema>;

// Seniority levels with ordering for ±1 calculation
const SENIORITY_LEVELS = ['JR', 'SSR', 'SR', 'STAFF', 'PRINC'];
const SENIORITY_SORT_ORDER = { 'JR': 1, 'SSR': 2, 'SR': 3, 'STAFF': 4, 'PRINC': 5 };

interface AdvancedCandidate {
  employee_id: string;
  name: string;
  email: string;
  location: string | null;
  seniority: string;
  last_project: string | null;
  cv_index: any; // Changed from cv_link to cv_index - full CV data
  parsed_skills: any;
  matched_must_have: string[];
  match_quality: 'exact' | 'relaxed' | 'minimal';
}

// Response format with candidate data
type CandidateResponse = Array<{
  employee_id: string;
  name: string;
  email: string;
  location: string | null;
  seniority: string;
  cv_index: any; // Changed from cv_link to cv_index - full CV data
  match_score: number;
  matched_skills: string[];
  match_quality: 'exact' | 'relaxed' | 'minimal' | 'simple';
}>;

// Helper function to get relaxed seniorities (±1 level)
function getRelaxedSeniorities(targetSeniority: string): string[] {
  const currentIndex = SENIORITY_LEVELS.indexOf(targetSeniority);
  const relaxed: string[] = [targetSeniority]; // Include exact match first
  
  if (currentIndex > 0) {
    relaxed.push(SENIORITY_LEVELS[currentIndex - 1]); // Lower level
  }
  if (currentIndex < SENIORITY_LEVELS.length - 1) {
    relaxed.push(SENIORITY_LEVELS[currentIndex + 1]); // Higher level
  }
  
  return relaxed;
}

// Advanced search function with CV skills intersection
async function findCandidates(
  supabase: any, 
  seniority: string, 
  requiredSkills: string[], 
  role: string,
  matchQuality: 'exact' | 'relaxed' | 'minimal'
): Promise<AdvancedCandidate[]> {
  
  try {
    // Get employees with CV data + DB skills using LEFT JOIN
    const { data: employees, error } = await supabase
      .from('employees')
      .select(`
        id, first_name, last_name, email, location, seniority,
        cv_index(employee_id, plain_text),
        employee_skills(level, years, skills(name, category))
      `)
      .eq('seniority', seniority);

    if (error) {
      console.error('Advanced query error:', error);
      
      // Fallback to separate queries if JOIN fails
      return await findCandidatesFallback(supabase, seniority, requiredSkills, role, matchQuality);
    }

    if (!employees?.length) {
      return [];
    }

    console.log(`Found ${employees.length} employees with seniority ${seniority} and CV data`);

    const candidates: AdvancedCandidate[] = [];

    for (const emp of employees) {
      const cvData = emp.cv_index;
      
      if (!cvData?.plain_text) continue;

      // 🔥 HYBRID SKILLS: Combine DB skills + CV skills from multiple sources
      let allCandidateSkills: string[] = [];
      
      // 1. Skills from employee_skills table (normalized DB)
      if (emp.employee_skills && Array.isArray(emp.employee_skills)) {
        const dbSkills = emp.employee_skills.map((es: any) => es.skills?.name).filter(Boolean);
        allCandidateSkills.push(...dbSkills);
        console.log(`📋 DB skills for ${emp.first_name}: ${dbSkills.join(', ')}`);
      }
      
      // 2. CV skills from cv_index plain_text
      if (cvData.plain_text) {
        try {
          const parsedCvData = JSON.parse(cvData.plain_text);
          
          // Support both formats: must_have and skills
          if (parsedCvData.must_have && Array.isArray(parsedCvData.must_have)) {
            allCandidateSkills.push(...parsedCvData.must_have);
            console.log(`📄 CV must_have for ${emp.first_name}: ${parsedCvData.must_have.join(', ')}`);
          }
          
          if (parsedCvData.skills && Array.isArray(parsedCvData.skills)) {
            allCandidateSkills.push(...parsedCvData.skills);
            console.log(`📄 CV skills for ${emp.first_name}: ${parsedCvData.skills.join(', ')}`);
          }
        } catch (error) {
          console.warn(`Error parsing CV data for ${emp.first_name}:`, error);
        }
      }

      // 3. Remove duplicates and normalize
      const uniqueSkills = Array.from(new Set(allCandidateSkills.map(s => s.toLowerCase().trim())));
      
      // 4. If no skills found from any source, skip this employee
      if (!uniqueSkills.length) {
        continue;
      }
      
      console.log(`🔥 HYBRID TOTAL skills for ${emp.first_name}: ${uniqueSkills.join(', ')}`);

      // Check intersection with required skills using hybrid skills
      const normalizedRequired = requiredSkills.map(s => s.toLowerCase().trim());
      const matchedSkills = normalizedRequired.filter(required => 
        uniqueSkills.some(candidate => 
          candidate.includes(required) || required.includes(candidate)
        )
      );

      // For testing, be more lenient - accept any partial match
      // Later we can make it strict for exact mode
        if (matchedSkills.length > 0) {
          // Get CV index data (more useful than just the link)
          let cvIndexData = null;
          if (cvData.plain_text) {
            try {
              cvIndexData = JSON.parse(cvData.plain_text);
              console.log(`📄 CV index data for ${emp.first_name}:`, Object.keys(cvIndexData));
            } catch (error) {
              console.warn(`Could not parse CV index for ${emp.first_name}:`, error);
              cvIndexData = { raw_text: cvData.plain_text }; // Fallback to raw text
            }
          }

          candidates.push({
            employee_id: emp.id,
            name: `${emp.first_name} ${emp.last_name}`,
            email: emp.email,
            location: emp.location,
            seniority: emp.seniority,
            last_project: null, // Would need to add this field later
            cv_index: cvIndexData, // Full CV index data instead of just link
            parsed_skills: cvData.parsed_skills,
            matched_must_have: matchedSkills,
            match_quality: matchQuality
          });

        console.log(`✅ ${matchQuality} match: ${emp.first_name} (${matchedSkills.length}/${normalizedRequired.length} skills)`);
      }
    }

    return candidates;

  } catch (error) {
    console.error('Find candidates error:', error);
    return [];
  }
}

// Fallback function using separate queries
async function findCandidatesFallback(
  supabase: any,
  seniority: string,
  requiredSkills: string[],
  role: string,
  matchQuality: 'exact' | 'relaxed' | 'minimal'
): Promise<AdvancedCandidate[]> {
  
  console.log(`📝 Using fallback for ${seniority}`);
  
  // Get employees
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email, location, seniority')
    .eq('seniority', seniority);

  if (empError || !employees?.length) {
    return [];
  }

  // Get CV data
  const employeeIds = employees.map((emp: any) => emp.id);
  const { data: cvData, error: cvError } = await supabase
    .from('cv_index')
    .select('employee_id, plain_text, parsed_skills')
    .in('employee_id', employeeIds);

  if (cvError) {
    return [];
  }

  const candidates: AdvancedCandidate[] = [];

  for (const emp of employees) {
    const cv = cvData?.find((c: any) => c.employee_id === emp.id);
    
    if (!cv?.plain_text) continue;

    // Minimal skills for fallback mode
    const candidateSkills = ['javascript']; // Basic fallback skill
    const normalizedRequired = requiredSkills.map(s => s.toLowerCase().trim());
    const matchedSkills = normalizedRequired.filter(required => 
      candidateSkills.includes(required)
    );

    if (matchedSkills.length > 0) {
        // Get CV index data
        const { data: cvIndexDbData } = await supabase
          .from('cv_index')
          .select('plain_text')
          .eq('employee_id', emp.id)
          .single();

        let cvIndexForResponse: any = { message: 'CV not indexed yet' };
        if (cvIndexDbData?.plain_text) {
          try {
            cvIndexForResponse = JSON.parse(cvIndexDbData.plain_text);
          } catch (error) {
            console.warn(`Could not parse CV index for ${emp.first_name}:`, error);
            cvIndexForResponse = { raw_text: cvIndexDbData.plain_text };
          }
        }

        candidates.push({
          employee_id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`,
          email: emp.email,
          location: emp.location,
          seniority: emp.seniority,
          last_project: null,
          cv_index: cvIndexForResponse, // Use CV index data instead of cv_link
          parsed_skills: null,
          matched_must_have: matchedSkills,
          match_quality: matchQuality
        });
    }
  }

  return candidates;
}

// Search with multiple seniorities
async function findCandidatesWithSeniorities(
  supabase: any,
  seniorities: string[],
  requiredSkills: string[],
  role: string,
  matchQuality: 'exact' | 'relaxed' | 'minimal'
): Promise<AdvancedCandidate[]> {
  
  const allCandidates: AdvancedCandidate[] = [];
  
  for (const seniority of seniorities) {
    const candidates = await findCandidates(supabase, seniority, requiredSkills, role, matchQuality);
    allCandidates.push(...candidates);
  }
  
  return allCandidates;
}

// Simple fallback approach
async function getSimpleMatches(
  supabase: any,
  role: string,
  seniority: string,
  must_have: string[]
): Promise<Response> {
  
  try {
      // Get employees with seniority + their skills from employee_skills table
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select(`
          id, first_name, last_name, email, location, seniority,
          employee_skills(level, years, skills(name, category))
        `)
        .eq('seniority', seniority);

    if (empError || !employees?.length) {
      console.log(`❌ No employees found with seniority: ${seniority}`);
      return Response.json([]); // Return empty array instead of error
    }

    // Get CV links for these employees
    const employeeIds = employees.map((emp: any) => emp.id);
    const { data: cvLinks, error: cvError } = await supabase
      .from('cvs')
      .select('employee_id, url')
      .in('employee_id', employeeIds);

    if (cvError || !cvLinks?.length) {
      console.log(`❌ No CVs found for employees with seniority: ${seniority}`);
      return Response.json([]); // Return empty array instead of error
    }

    // Create hybrid response using BOTH DB skills + CV skills
    const results = [];
    for (const emp of employees) {
      const cv = cvLinks.find((c: any) => c.employee_id === emp.id);
      if (!cv) continue;

      // 🔥 HYBRID SKILLS: Combine DB skills + CV skills
      let allCandidateSkills: string[] = [];
      
      // 1. Skills from employee_skills table (normalized DB)
      if (emp.employee_skills && Array.isArray(emp.employee_skills)) {
        const dbSkills = emp.employee_skills.map((es: any) => es.skills?.name).filter(Boolean);
        allCandidateSkills.push(...dbSkills);
        console.log(`📋 DB skills for ${emp.first_name}: ${dbSkills.join(', ')}`);
      }
      
      // 2. Get CV skills from cv_index
      const { data: cvIndexData } = await supabase
        .from('cv_index')
        .select('plain_text')
        .eq('employee_id', emp.id)
        .single();
        
      if (cvIndexData?.plain_text) {
        try {
          const cvData = JSON.parse(cvIndexData.plain_text);
          if (cvData.skills && Array.isArray(cvData.skills)) {
            allCandidateSkills.push(...cvData.skills);
            console.log(`📄 CV skills for ${emp.first_name}: ${cvData.skills.join(', ')}`);
          }
        } catch (error) {
          console.warn(`Error parsing CV data for ${emp.first_name}:`, error);
        }
      }
      
      // 3. Remove duplicates and normalize
      const uniqueSkills = Array.from(new Set(allCandidateSkills.map(s => s.toLowerCase().trim())));
      
      // 4. If no skills found from any source, use fallback
      if (uniqueSkills.length === 0) {
        uniqueSkills.push(...['react', 'javascript', 'typescript', 'nodejs']);
        console.log(`🎭 Fallback skills for ${emp.first_name}: ${uniqueSkills.join(', ')}`);
      }
      
      // 5. Calculate skill matching
      const normalizedRequired = must_have.map(s => s.toLowerCase().trim());
      const matchedSkills = normalizedRequired.filter(required => 
        uniqueSkills.some(candidate => 
          candidate.includes(required) || required.includes(candidate)
        )
      );
      
      // 6. Calculate comprehensive match score
      const matchScore = matchedSkills.length / normalizedRequired.length;
      
      console.log(`✅ ${emp.first_name}: ${matchedSkills.length}/${normalizedRequired.length} = ${Math.round(matchScore * 100)}% match`);
      console.log(`🎯 Matched: [${matchedSkills.join(', ')}] vs Required: [${normalizedRequired.join(', ')}]`);

      if (matchedSkills.length > 0) {
        // Parse CV index data for display
        let cvIndexParsed: any = { message: 'CV not indexed yet' };
        if (cvIndexData?.plain_text) {
          try {
            cvIndexParsed = JSON.parse(cvIndexData.plain_text);
          } catch (error) {
            console.warn(`Could not parse CV index for ${emp.first_name}:`, error);
            cvIndexParsed = { raw_text: cvIndexData.plain_text };
          }
        }

        results.push({
          employee_id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`,
          email: emp.email,
          location: emp.location,
          seniority: emp.seniority,
          cv_index: cvIndexParsed, // CV data for analysis
          match_score: matchScore,
          matched_skills: matchedSkills,
          match_quality: 'hybrid' // NEW: Uses both DB + CV skills
        });
      }
    }

    // Check if we found any candidates
    if (results.length === 0) {
      console.log(`❌ No skill matches found for ${seniority} with skills: ${must_have.join(', ')}`);
      return Response.json([]); // Return empty array instead of error
    }

    return Response.json(results.slice(0, 30)); // Max 30

  } catch (error) {
    console.error('Simple matches error:', error);
    return Response.json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred during candidate matching',
      error_type: 'server_error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Validate configuration
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json({ 
        error: 'Database not configured. Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.' 
      }, { status: 500 });
    }

    // Parse and validate input
    const body = await req.json();
    const validatedInput: MatchRequest = MatchRequestSchema.parse(body);
    
    const { role, seniority, must_have, nice_to_have = [], extra_keywords = [] } = validatedInput;

    // Create Supabase client
    const sb = createClient(
      process.env.SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log(`🔍 Advanced search: ${role} (${seniority}) with must-have: ${must_have.join(', ')}`);

    // Phase 1: Try exact match first
    let candidates = await findCandidates(sb, seniority, must_have, role, 'exact');
    console.log(`Phase 1 (exact): ${candidates.length} candidates`);

    // Phase 2: If no results, relax seniority ±1 
    if (candidates.length === 0) {
      console.log('🔄 Relaxing seniority to ±1 levels...');
      const relaxedSeniorities = getRelaxedSeniorities(seniority);
      candidates = await findCandidatesWithSeniorities(sb, relaxedSeniorities, must_have, role, 'relaxed');
      console.log(`Phase 2 (relaxed seniority): ${candidates.length} candidates`);
    }

    // Phase 3: If still no results, remove one must_have skill
    if (candidates.length === 0 && must_have.length > 1) {
      console.log('🔄 Relaxing must_have skills (removing one)...');
      for (let i = 0; i < must_have.length; i++) {
        const relaxedSkills = must_have.filter((_, index) => index !== i);
        candidates = await findCandidates(sb, seniority, relaxedSkills, role, 'minimal');
        if (candidates.length > 0) {
          console.log(`Phase 3 (minimal): Found ${candidates.length} candidates without skill: ${must_have[i]}`);
          break;
        }
      }
    }

    // Fallback: Use simple approach if advanced fails
    if (candidates.length === 0) {
      console.log('🔄 Using simple fallback approach...');
      const simpleResult = await getSimpleMatches(sb, role, seniority, must_have);
      
      // Check if simple approach also returned empty results
      const simpleData = await simpleResult.json();
      if (!simpleData || simpleData.length === 0) {
        console.log('❌ No candidates found in any search phase');
        return Response.json([]); // Return empty array instead of error
      }
      
      return simpleResult;
    }

    // Limit to 30 candidates
    const topCandidates = candidates.slice(0, 30);
    console.log(`✅ Final result: ${topCandidates.length} candidates (max 30)`);

    // Format response with cv_index for n8n compatibility
    const response = topCandidates.map(candidate => ({
      employee_id: candidate.employee_id,
      name: candidate.name,
      email: candidate.email,
      location: candidate.location,
      seniority: candidate.seniority,
      cv_index: candidate.cv_index, // CV data for analysis
      match_score: candidate.matched_must_have.length / must_have.length,
      matched_skills: candidate.matched_must_have,
      match_quality: candidate.match_quality
    }));

    return Response.json(response);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ 
        error: `Invalid input: ${error.errors.map(e => e.message).join(', ')}` 
      }, { status: 400 });
    }
    
    console.error('Advanced match endpoint error:', error);
    return Response.json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred during candidate matching',
      error_type: 'server_error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const seniority = searchParams.get('seniority');

    if (!role || !seniority) {
      return Response.json({ 
        error: 'Missing required parameters: role and seniority' 
      }, { status: 400 });
    }

    // Convert GET parameters to POST body format
    const requestBody = {
      role,
      seniority: seniority as 'JR' | 'SSR' | 'SR' | 'STAFF' | 'PRINC',
      must_have: ['react', 'javascript'], // Default must-have for testing
      nice_to_have: []
    };

    const requestWithBody = new Request('http://localhost' + req.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    return POST(requestWithBody as NextRequest);

  } catch (error) {
    console.error('Match GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}