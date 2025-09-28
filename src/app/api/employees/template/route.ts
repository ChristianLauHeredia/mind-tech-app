import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const operation = searchParams.get('operation') || 'create';

  let csvContent = '';
  let filename = '';

        if (operation === 'create') {
          csvContent = `first_name,last_name,email,position,seniority,location,timezone,manager_email,cv_url,skills
Juan,Pérez,juan.perez@company.com,Frontend Engineer,SR,CDMX,America/Mexico_City,manager@company.com,https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view,"React, JavaScript, HTML, CSS"
María,García,maria.garcia@company.com,Backend Engineer,SSR,GDL,America/Mexico_City,manager@company.com,https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view,"Node.js, PostgreSQL, Docker"`;
          filename = 'employees_create_template.csv';
        } else if (operation === 'update') {
    csvContent = `id,first_name,last_name,email,position,seniority,location,timezone,manager_email,cv_url,active,skills
31a52b31-9333-401f-a57d-b5ca1b68ffad,Juan,Pérez,juan.perez@company.com,Senior Frontend Engineer,SR,CDMX,America/Mexico_City,manager@company.com,https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view,true,"React, TypeScript, Next.js"
2c286ccd-6453-4599-8720-18dec203c2dc,María,García,maria.garcia@company.com,Backend Engineer,SR,GDL,America/Mexico_City,manager@company.com,https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view,true,"Python, Django, PostgreSQL"`;
    filename = 'employees_update_template.csv';
  } else if (operation === 'delete') {
    csvContent = `id,email
31a52b31-9333-401f-a57d-b5ca1b68ffad,
,juan.perez@company.com`;
    filename = 'employees_delete_template.csv';
        } else {
          csvContent = `first_name,last_name,email,position,seniority,location,timezone,manager_email,cv_url,skills
,,,,,,,,,`;
          filename = 'employees_template.csv';
        }

  return new Response(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
}
