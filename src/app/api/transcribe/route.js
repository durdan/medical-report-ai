import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
  timeout: 30000,
});

async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // If it's a connection error, wait and retry
      if (error.code === 'ECONNRESET' || error.type === 'system') {
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
}

export async function POST(request) {
  let tempFilePath = null;
  
  try {
    console.log('Received transcription request');
    
    // Get the form data
    const formData = await request.formData();
    const audioFile = formData.get('audio');
    
    if (!audioFile) {
      return NextResponse.json(
        { error: { message: 'No audio file provided' } },
        { status: 400 }
      );
    }

    // Convert the file to a Buffer
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    
    console.log('Audio file size:', buffer.length, 'bytes');
    console.log('Audio file type:', audioFile.type);

    // Create a temporary file
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `whisper-${Date.now()}.wav`);
    fs.writeFileSync(tempFilePath, buffer);
    
    console.log('Temporary file created:', tempFilePath);
    console.log('Sending to Whisper API...');
    
    // Use retry mechanism for the API call
    const transcription = await retryWithBackoff(async () => {
      return await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: 'whisper-1',
        response_format: 'json',
        temperature: 0.2,
        language: 'en',
      });
    });

    console.log('Transcription received');
    return NextResponse.json({ text: transcription.text });
    
  } catch (error) {
    console.error('Transcription error:', error);
    
    // Determine the appropriate error status
    let status = 500;
    if (error.code === 'ECONNRESET' || error.type === 'system') {
      status = 503; // Service Unavailable
    } else if (error.status) {
      status = error.status;
    }
    
    return NextResponse.json(
      { 
        error: { 
          message: error.message || 'An unexpected error occurred',
          type: error.type,
          param: error.param,
          code: error.code 
        } 
      },
      { status }
    );
  } finally {
    // Clean up the temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log('Temporary file cleaned up');
      } catch (err) {
        console.error('Error cleaning up temporary file:', err);
      }
    }
  }
}
