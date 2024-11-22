import { query } from '../src/lib/db/index.js';

async function insertDefaultPrompts() {
  try {
    // First, check if we have any system prompts
    const existingPrompts = await query(
      'SELECT COUNT(*) as count FROM prompts WHERE is_system = true',
      []
    );

    if (existingPrompts.rows[0].count === '0') {
      console.log('No system prompts found. Inserting defaults...');
      
      // Insert General Medical Report prompt
      await query(
        `INSERT INTO prompts (id, title, content, specialty, is_system, user_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'default-general',
          'General Medical Report',
          `You are a professional medical report generator. Your task is to generate a clear, concise, and accurate medical report based on the provided findings. Please follow these guidelines:

1. Use professional medical terminology
2. Maintain a clear and logical structure
3. Include all relevant findings
4. Highlight any critical observations
5. Suggest follow-up actions if necessary

Please generate a comprehensive medical report based on the provided findings.`,
          'General',
          true,
          '550e8400-e29b-41d4-a716-446655440000'
        ]
      );

      // Insert Radiology Report prompt
      await query(
        `INSERT INTO prompts (id, title, content, specialty, is_system, user_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'default-radiology',
          'Radiology Report',
          `You are a specialized radiologist. Your task is to generate a detailed radiology report based on the provided imaging findings. Please follow these guidelines:

1. Use standard radiological terminology
2. Follow systematic approach (e.g., from superior to inferior)
3. Describe all relevant anatomical structures
4. Note any abnormalities or pathological findings
5. Compare with prior studies if available
6. Provide clear impressions and recommendations

Please generate a detailed radiology report based on the provided imaging findings.`,
          'Radiology',
          true,
          '550e8400-e29b-41d4-a716-446655440000'
        ]
      );

      console.log('Default prompts inserted successfully!');
    } else {
      console.log('System prompts already exist.');
    }

    // Verify prompts
    const allPrompts = await query(
      'SELECT id, title, content, specialty FROM prompts WHERE is_system = true',
      []
    );
    console.log('Current system prompts:', allPrompts.rows);

  } catch (error) {
    console.error('Error inserting default prompts:', error);
  }
}

// Run the script
insertDefaultPrompts();
