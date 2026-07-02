import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Không có file được tải lên' }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const timestamp = Date.now();
    const uniqueName = `reports/${timestamp}_${safeName}`;

    // Upload to Vercel Blob (token is auto-read from BLOB_READ_WRITE_TOKEN env var)
    const blob = await put(uniqueName, file, {
      access: 'public',
    });

    return NextResponse.json({ success: true, fileUrl: blob.url });
  } catch (error: any) {
    console.error('Lỗi upload file:', error);
    return NextResponse.json({ success: false, error: error.message || 'Lỗi upload file' }, { status: 500 });
  }
}
