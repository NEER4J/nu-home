import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { submissionId, imageData } = await request.json();

    if (!submissionId || !imageData) {
      return NextResponse.json(
        { error: 'Missing submissionId or imageData' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Convert base64 to blob
    const response = await fetch(imageData);
    const blob = await response.blob();
    
    // Create file name
    const fileName = `roof-mapping-${submissionId}-${Date.now()}.png`;
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('roof-mappings')
      .upload(fileName, blob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase storage error:', error);
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('roof-mappings')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      imageUrl: urlData.publicUrl,
      fileName: fileName
    });

  } catch (error) {
    console.error('Error uploading roof mapping image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
