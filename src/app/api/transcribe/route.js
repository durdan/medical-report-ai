import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  let tempFilePath = null;

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio');

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Convert blob to buffer
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    
    // Create temporary file
    tempFilePath = path.join(os.tmpdir(), `whisper-${Date.now()}.webm`);
    await fs.promises.writeFile(tempFilePath, buffer);

    // Create file handle for OpenAI
    const file = fs.createReadStream(tempFilePath);

    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en',
      temperature: 0.2,
      prompt: 'This is a medical dictation containing clinical terms, diagnoses, and medical procedures. Focus on medical terminology accuracy.',
    });

    // Close the file stream
    file.destroy();

    // Process the transcription
    let transcribedText = transcription.text;
    transcribedText = await postProcessMedicalTerms(transcribedText);

    // Cleanup temp file
    if (tempFilePath) {
      await fs.promises.unlink(tempFilePath).catch(console.error);
    }

    return NextResponse.json({ text: transcribedText });

  } catch (error) {
    console.error('Transcription error:', error);

    // Cleanup temp file in case of error
    if (tempFilePath) {
      await fs.promises.unlink(tempFilePath).catch(console.error);
    }

    // Handle specific API errors
    if (error.response) {
      return NextResponse.json(
        { error: `OpenAI API error: ${error.response.status} - ${error.response.data?.error?.message || error.message}` },
        { status: error.response.status }
      );
    }

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Medical terminology post-processing
async function postProcessMedicalTerms(text) {
  try {
    // Split text into words while preserving punctuation
    const words = text.split(/(\s+)/).filter(Boolean);
    
    // Process each word
    const processedWords = await Promise.all(words.map(async (word) => {
      // Skip punctuation and short words
      if (word.trim().length <= 2 || /^\s+$/.test(word)) {
        return word;
      }

      // Check if word might be a medical term (basic heuristic)
      const mightBeMedicalTerm = /^[A-Z]|[a-z]{3,}/.test(word);
      
      if (mightBeMedicalTerm) {
        // Use medical terminology correction
        const correctedTerm = await correctMedicalTerm(word);
        return correctedTerm || word;
      }
      
      return word;
    }));

    return processedWords.join('');
  } catch (error) {
    console.error('Post-processing error:', error);
    return text; // Return original text if post-processing fails
  }
}

// Medical term correction using common medical terms database
async function correctMedicalTerm(word) {
  // Common medical term corrections (can be expanded)
  const medicalTerms = {
    // Anatomical terms
    'hart': 'heart',
    'brane': 'brain',
    'stomack': 'stomach',
    'throwt': 'throat',
    'kidnee': 'kidney',
    'lung': 'lung',
    'lyver': 'liver',
    
    // Common conditions
    'hipertension': 'hypertension',
    'diebetes': 'diabetes',
    'arthritis': 'arthritis',
    'ahlzeimers': 'alzheimer\'s',
    'parkinsons': 'parkinson\'s',
    
    // Procedures
    'surgary': 'surgery',
    'biopsey': 'biopsy',
    'endoscapy': 'endoscopy',
    'catherization': 'catheterization',
    
    // Medications
    'amoxicilin': 'amoxicillin',
    'ibuprofin': 'ibuprofen',
    'acetaminophin': 'acetaminophen',
    
    // Medical specialties
    'cardiolegy': 'cardiology',
    'neurolegy': 'neurology',
    'oncolegy': 'oncology',
    
    // Common medical phrases
    'vitels': 'vitals',
    'simptoms': 'symptoms',
    'diagnoses': 'diagnosis',
    'prognoses': 'prognosis'
  };

  // Convert to lowercase for comparison
  const lowercaseWord = word.toLowerCase();
  
  // Check if word exists in our medical terms dictionary
  if (medicalTerms[lowercaseWord]) {
    // Preserve original capitalization
    if (word[0] === word[0].toUpperCase()) {
      return medicalTerms[lowercaseWord][0].toUpperCase() + 
             medicalTerms[lowercaseWord].slice(1);
    }
    return medicalTerms[lowercaseWord];
  }

  return null; // Return null if no correction needed
}
