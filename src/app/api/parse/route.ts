import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    
    if (!text || typeof text !== 'string') {
      return new Response('Missing or invalid text field', { status: 400 });
    }

    const prompt = `Analiza el siguiente texto de una solicitud de trabajo y extrae la información estructurada. 

Texto: "${text}"

Extrae y devuelve SOLO un JSON válido con esta estructura exacta:
{
  "role": "nombre del puesto o rol",
  "seniority": "JR|SSR|SR|STAFF|PRINC",
  "must_have": ["skill1", "skill2", "skill3"],
  "nice_to_have": ["skill4", "skill5"],
  "extra_keywords": ["concepto1", "concepto2"]
}

Reglas:
- role: El nombre del puesto o rol mencionado
- seniority: Solo uno de: JR, SSR, SR, STAFF, PRINC (usa tu criterio técnico)
- must_have: Skills/tecnologías obligatorias mencionadas
- nice_to_have: Skills/tecnologías deseables o adicionales
- extra_keywords: Conceptos, frameworks, metodologías relevantes

Responde SOLO con el JSON, sin texto adicional.`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un parser técnico que devuelve JSON válido y estructurado. Siempre responde solo con JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 1000
    });

    const responseText = completion.choices[0]?.message?.content?.trim();
    
    if (!responseText) {
      return new Response('No response from OpenAI', { status: 500 });
    }

    // Intentar parsear la respuesta JSON
    try {
      const parsedResponse = JSON.parse(responseText);
      
      // Validar estructura básica
      if (!parsedResponse.role || !parsedResponse.seniority || !Array.isArray(parsedResponse.must_have)) {
        return new Response('Invalid JSON structure', { status: 500 });
      }

      // Validar seniority
      const validSeniorities = ['JR', 'SSR', 'SR', 'STAFF', 'PRINC'];
      if (!validSeniorities.includes(parsedResponse.seniority)) {
        return new Response('Invalid seniority level', { status: 500 });
      }

      return Response.json(parsedResponse);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response text:', responseText);
      return new Response('Invalid JSON', { status: 500 });
    }

  } catch (error) {
    console.error('Parse endpoint error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
