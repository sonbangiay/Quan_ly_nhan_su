import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    // Clean filename to avoid URL issues
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const fileName = `${Date.now()}_${safeName}`;
    
    // Upload to Vercel Blob
    const blob = await put(fileName, file, {
      access: 'public',
    });

    return NextResponse.json({ success: true, fileUrl: blob.url });
  } catch (error: any) {
    console.error('Error uploading file to Vercel Blob:', error);
    return NextResponse.json({ success: false, error: error.message || 'Upload failed' }, { status: 500 });
  }
}
