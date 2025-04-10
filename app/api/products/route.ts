import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Add these interfaces at the top of the file, after the imports
interface FormAnswer {
  answer: string;
  question_id: string;
  question_text: string;
}

interface Lead {
  form_answers: FormAnswer[];
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  postcode: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const submissionId = searchParams.get('submission_id');
  const categorySlug = searchParams.get('category');
  
  // Get filter parameters
  const boilerTypes = searchParams.get('boilerTypes')?.split(',') || [];
  const fuelTypes = searchParams.get('fuelTypes')?.split(',') || [];
  const propertySizes = searchParams.get('propertySizes')?.split(',') || [];

  const supabase = createRouteHandlerClient({ cookies });

  if (!submissionId) {
    return NextResponse.json({ error: 'No submission ID provided' }, { status: 400 });
  }

  try {
    // 1. Get the customer's form answers
    const { data: lead, error: leadError } = await supabase
      .from('partner_leads')
      .select('*')
      .eq('submission_id', submissionId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // 2. Get the category ID
    const { data: category, error: categoryError } = await supabase
      .from('ServiceCategories')
      .select('service_category_id')
      .eq('slug', categorySlug)
      .single();

    if (categoryError || !category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // 3. Get all products for the category
    let query = supabase
      .from('PartnerProducts')
      .select(`
        partner_product_id,
        name,
        description,
        price,
        image_url,
        slug,
        product_fields,
        specifications
      `)
      .eq('service_category_id', category.service_category_id)
      .eq('is_active', true);

    // Apply filters if provided
    if (boilerTypes.length > 0) {
      query = query.filter('product_fields->boiler_type', 'in', `(${boilerTypes.join(',')})`);
    }
    if (fuelTypes.length > 0) {
      // Handle both fuel_type and fule_type fields
      query = query.or(`product_fields->fuel_type.in.(${fuelTypes.join(',')}),product_fields->fule_type.in.(${fuelTypes.join(',')})`);
    }
    if (propertySizes.length > 0) {
      query = query.filter('product_fields->bedroom_size', 'in', `(${propertySizes.join(',')})`);
    }

    const { data: products, error: productsError } = await query;

    if (productsError) {
      return NextResponse.json({ error: 'Error fetching products' }, { status: 500 });
    }

    // 4. Add match details for all products (even if they don't match form answers)
    const productsWithMatches = products.map(product => {
      const matchDetails: Array<{
        type: string;
        userAnswer: string;
        productValue: string;
        matches: boolean;
      }> = [];

      // Process each form answer
      (lead as Lead).form_answers.forEach((answer: FormAnswer) => {
        const questionLower = answer.question_text.toLowerCase();
        const answerLower = answer.answer.toLowerCase();

        // Add match details for each filter type
        if (questionLower.includes('type of boiler') && product.product_fields?.boiler_type) {
          matchDetails.push({
            type: 'Boiler Type',
            userAnswer: answer.answer,
            productValue: product.product_fields.boiler_type,
            matches: product.product_fields.boiler_type.toLowerCase() === answerLower
          });
        }

        if (questionLower.includes('fuel')) {
          const productFuelType = (product.product_fields?.fuel_type || product.product_fields?.fule_type || '').toLowerCase();
          matchDetails.push({
            type: 'Fuel Type',
            userAnswer: answer.answer,
            productValue: product.product_fields?.fuel_type || product.product_fields?.fule_type || 'Not specified',
            matches: productFuelType === answerLower
          });
        }

        if (questionLower.includes('bedroom')) {
          const productBedrooms = Array.isArray(product.product_fields?.bedroom_size) 
            ? product.product_fields.bedroom_size 
            : [product.product_fields?.bedroom_size];
          
          matchDetails.push({
            type: 'Property Size',
            userAnswer: answer.answer,
            productValue: 'Suitable for ' + productBedrooms.join(', ') + ' bedrooms',
            matches: productBedrooms.some((size: string | number) => size.toString().toLowerCase() === answer.answer.toLowerCase())
          });
        }
      });

      return {
        ...product,
        matchDetails
      };
    });

    return NextResponse.json({
      products: productsWithMatches,
      customerDetails: {
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        city: lead.city,
        postcode: lead.postcode,
        form_answers: lead.form_answers
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 