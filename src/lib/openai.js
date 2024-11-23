import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateReport(prompt, specialty, findings) {
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert medical report writer specializing in ${specialty}. Generate a detailed medical report based on the findings provided.`,
        },
        {
          role: 'user',
          content: `Findings: ${findings}\n\nPrompt: ${prompt}\n\nPlease generate a detailed medical report.`,
        },
      ],
      temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
      max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 1000,
    });

    return completion.choices[0]?.message?.content;
  } catch (error) {
    console.error('Error generating report:', error);
    throw new Error('Failed to generate report');
  }
}

export async function refineReport(report, feedback) {
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert medical report editor. Refine the medical report based on the feedback provided.',
        },
        {
          role: 'user',
          content: `Original Report: ${report}\n\nFeedback: ${feedback}\n\nPlease refine the report based on this feedback.`,
        },
      ],
      temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
      max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 1000,
    });

    return completion.choices[0]?.message?.content;
  } catch (error) {
    console.error('Error refining report:', error);
    throw new Error('Failed to refine report');
  }
}

// Re-export for backward compatibility
export const generateMedicalReport = generateReport;
