import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateMedicalReport(findings, specialty, systemPrompt = null) {
  try {
    const messages = [
      {
        role: 'system', 
        content: systemPrompt || `You are a professional ${specialty} specialist. Generate a detailed medical report with the following sections:
1. FINDINGS: A structured presentation of the provided findings
2. IMPRESSION: A concise medical impression highlighting key observations and potential diagnoses
3. RECOMMENDATIONS: Suggested follow-up actions or additional studies if needed

Use appropriate medical terminology and formatting.`
      },
      {
        role: 'user', 
        content: `Generate a comprehensive medical report based on the following findings: ${findings}`
      }
    ];

    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4',
      messages: messages,
      temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.4,
      max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 1000,
    });

    // Return just the generated text
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating medical report:', error);
    throw error;
  }
}

export async function refineReport(originalFindings, originalReport, userEdits, systemPrompt = null) {
  try {
    const messages = [
      {
        role: 'system', 
        content: systemPrompt || `You are a professional medical report editor. Refine the medical report while:
1. Maintaining the original structure (FINDINGS, IMPRESSION, RECOMMENDATIONS)
2. Preserving medical accuracy and terminology
3. Incorporating user edits appropriately
4. Ensuring clarity and professionalism`
      },
      {
        role: 'user', 
        content: `Original Findings: ${originalFindings}\n\nOriginal Report: ${originalReport}\n\nUser Edits: ${userEdits}\n\nPlease refine the report considering the user edits while maintaining medical precision.`
      }
    ];

    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4',
      messages: messages,
      temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.4,
      max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 1000,
    });

    // Return just the generated text
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error refining medical report:', error);
    throw error;
  }
}
