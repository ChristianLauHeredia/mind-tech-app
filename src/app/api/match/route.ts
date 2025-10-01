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
  cv_link: string;
  parsed_skills: any;
  matched_must_have: string[];
  match_quality: 'exact' | 'relaxed' | 'minimal';
}

// Response format as requested
type MatchResponse = Array<{
  output: {
    role: string;
    seniority: string;
    must_have: string[];
    nice_to_have: string[];
    extra_keywords: string[];
  }
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
    // Get employees with CV data using JOIN (without parsed_skills)
    const { data: employees, error } = await supabase
      .from('employees')
      .select(`
        id, first_name, last_name, email, location, seniority,
        cv_index!inner(employee_id, plain_text)
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

      // Extract skills from plain_text (JSON string)
      let candidateSkills: string[] = [];
      
      if (cvData.plain_text) {
        try {
          const parsedCvData = JSON.parse(cvData.plain_text);
          
          if (parsedCvData.must_have && Array.isArray(parsedCvData.must_have)) {
            candidateSkills = parsedCvData.must_have.map((s: string) => s.toLowerCase().trim());
          }
        } catch (error) {
          console.warn(`Error parsing CV data for ${emp.first_name}:`, error);
        }
      }

      // If no skills found, use mock data for demo
      if (!candidateSkills.length) {
        candidateSkills = ['react', 'javascript', 'typescript', 'nodejs', 'express', 'mongodb'];
        console.log(`📝 Using mock skills for ${emp.first_name}: ${candidateSkills.join(', ')}`);
      } else {
        console.log(`📝 Real skills for ${emp.first_name}: ${candidateSkills.join(', ')}`);
      }

      // Check intersection with required skills
      const normalizedRequired = requiredSkills.map(s => s.toLowerCase().trim());
      const matchedSkills = normalizedRequired.filter(required => 
        candidateSkills.some(candidate => 
          candidate.includes(required) || required.includes(candidate)
        )
      );

      // For testing, be more lenient - accept any partial match
      // Later we can make it strict for exact mode
      if (matchedSkills.length > 0) {
        // Get CV link
        const { data: cvLinkData } = await supabase
          .from('cvs')
          .select('url')
          .eq('employee_id', emp.id)
          .single();

        candidates.push({
          employee_id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`,
          email: emp.email,
          location: emp.location,
          seniority: emp.seniority,
          last_project: null, // Would need to add this field later
          cv_link: cvLinkData?.url || '',
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

    // Mock skills for demo since we're in fallback mode
    const candidateSkills = ['react', 'javascript', 'typescript', 'nodejs'];
    const normalizedRequired = requiredSkills.map(s => s.toLowerCase().trim());
    const matchedSkills = normalizedRequired.filter(required => 
      candidateSkills.includes(required)
    );

    if (matchedSkills.length > 0) {
      // Get CV link
      const { data: cvLinkData } = await supabase
        .from('cvs')
        .select('url')
        .eq('employee_id', emp.id)
        .single();

      candidates.push({
        employee_id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        email: emp.email,
        location: emp.location,
        seniority: emp.seniority,
        last_project: null,
        cv_link: cvLinkData?.url || '',
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
): Promise<any> {
  
  try {
    // Get employees with seniority
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, email, location, seniority')
      .eq('seniority', seniority);

    if (empError || !employees?.length) {
      return Response.json([]);
    }

    // Get CV links for these employees
    const employeeIds = employees.map((emp: any) => emp.id);
    const { data: cvLinks, error: cvError } = await supabase
      .from('cvs')
      .select('employee_id, url')
      .in('employee_id', employeeIds);

    if (cvError || !cvLinks?.length) {
      return Response.json([]);
    }

    // Create simple response
    const results = [];
    for (const emp of employees) {
      const cv = cvLinks.find((c: any) => c.employee_id === emp.id);
      if (cv) {
        results.push({
          output: {
            role,
            seniority: emp.seniority,
            must_have: must_have, // Return what was requested for now
            nice_to_have: [],
            extra_keywords: []
          }
        });
      }
    }

    return Response.json(results.slice(0, 30)); // Max 30

  } catch (error) {
    console.error('Simple matches error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
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
      return await getSimpleMatches(sb, role, seniority, must_have);
    }

    // Limit to 30 candidates
    const topCandidates = candidates.slice(0, 30);
    console.log(`✅ Final result: ${topCandidates.length} candidates (max 30)`);

    // Format response
    const response: MatchResponse = topCandidates.map(candidate => ({
      output: {
        role,
        seniority: candidate.seniority,
        must_have: candidate.matched_must_have,
        nice_to_have: [], // Keep simple for now
        extra_keywords: []
      }
    }));

    return Response.json(response);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ 
        error: `Invalid input: ${error.errors.map(e => e.message).join(', ')}` 
      }, { status: 400 });
    }
    
    console.error('Advanced match endpoint error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
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

    // Create a POST request body and forward to POST handler
    const mockBody = {
      role,
      seniority: seniority as 'JR' | 'SSR' | 'SR' | 'STAFF' | 'PRINC',
      must_have: ['react', 'javascript'], // Default must-have for testing
      nice_to_have: []
    };

    const mockRequest = new Request('http://localhost' + req.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockBody)
    });

    return POST(mockRequest as NextRequest);

  } catch (error) {
    console.error('Match GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}