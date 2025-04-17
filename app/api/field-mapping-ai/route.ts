import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { wordpressFields, databaseFields, sampleProduct, mode } = await req.json();
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not set.' }, { status: 500 });
    }

    let prompt = '';
    if (mode === 'format') {
      // Combine global fields and category fields for the prompt
      const globalFields = [
        { key: 'name', label: 'Product Name', type: 'string', required: true },
        { key: 'slug', label: 'Slug', type: 'string', required: true },
        { key: 'description', label: 'Description', type: 'text', required: true },
        { key: 'price', label: 'Price', type: 'number', required: true },
        { key: 'image_url', label: 'Image URL', type: 'string', required: true },
        { key: 'specifications', label: 'Specifications', type: 'jsonb', required: true },
        { key: 'is_active', label: 'Active Status', type: 'boolean', required: true },
      ];
      const allDatabaseFields = [...globalFields, ...databaseFields];
      prompt = `You are an expert data integrator.\nGiven the following:\n- WordPress product data (as JSON)\n- WordPress field definitions (flattened, with paths and types)\n- Our own database fields for the selected category (with keys and types)\n\nTask:\nCreate a new JSON object where each key matches one of our database fields (including global fields).\nFor each database field, extract and format the most appropriate value from the WordPress product data.\nFormat the value as needed (e.g., join arrays, extract subfields, convert types, flatten objects, etc) to best fit the database field.\nIf a field cannot be filled, leave it out.\nReturn only the new JSON object. Do not explain.\n\nWordPress Fields (flattened):\n${JSON.stringify(wordpressFields, null, 2)}\n\nDatabase Fields:\n${JSON.stringify(allDatabaseFields, null, 2)}\n\nWordPress Product Data:\n${JSON.stringify(sampleProduct, null, 2)}\n`;
    } else {
      prompt = `You are an expert data integrator. Given the following WordPress fields, database fields, and a sample product, suggest the best mapping from WordPress fields to database fields. Return a JSON object where each database field key maps to the most appropriate WordPress field path.\n\nWordPress Fields (flattened):\n${JSON.stringify(wordpressFields, null, 2)}\n\nDatabase Fields:\n${JSON.stringify(databaseFields, null, 2)}\n\nSample Product:\n${JSON.stringify(sampleProduct, null, 2)}\n\nReturn only the JSON mapping.`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant for mapping and transforming data fields.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: 500 });
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    let result = {};
    try {
      result = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}');
    } catch (e) {
      result = {};
    }
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to process mapping.' }, { status: 500 });
  }
}
