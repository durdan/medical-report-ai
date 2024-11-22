import OpenAI from 'openai';

let openaiClient = null;

export async function getOpenAIClient() {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export async function generateMedicalReport(findings, specialty, promptText) {
  const openai = await getOpenAIClient();

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: promptText,
        },
        {
          role: 'user',
          content: findings,
        },
      ],
      model: process.env.AI_MODEL || 'gpt-3.5-turbo',
      temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
      max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 1000,
    });

    return completion.choices[0]?.message?.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate report: ' + error.message);
  }
}
