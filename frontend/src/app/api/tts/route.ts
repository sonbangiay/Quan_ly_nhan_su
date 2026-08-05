import { NextRequest, NextResponse } from 'next/server';
import { EdgeTTS } from 'node-edge-tts';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export async function POST(req: NextRequest) {
  try {
    const { text, voice, pitch, rate, volume } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const tts = new EdgeTTS({
      voice: voice || 'ja-JP-NanamiNeural',
      lang: 'ja-JP',
      pitch: pitch || 'default',
      rate: rate || 'default',
      volume: volume || 'default'
    });

    // Create a temporary file path
    const tmpFilePath = path.join(os.tmpdir(), `tts-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`);
    
    // Generate TTS and save to temp file
    await tts.ttsPromise(text, tmpFilePath);
    
    // Read the file into a buffer
    const audioBuffer = await fs.readFile(tmpFilePath);
    
    // Clean up
    await fs.unlink(tmpFilePath).catch(() => {});

    // Return the audio buffer
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'no-store, max-age=0'
      },
    });

  } catch (error) {
    console.error('TTS API Error:', error);
    return NextResponse.json({ error: 'Failed to generate TTS' }, { status: 500 });
  }
}
