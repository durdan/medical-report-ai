import fs from 'fs/promises';
import path from 'path';

export async function POST(request) {
  try {
    const { findings, report, specialty, timestamp } = await request.json();
    
    // Create reports directory if it doesn't exist
    const reportsDir = path.join(process.cwd(), 'reports');
    await fs.mkdir(reportsDir, { recursive: true });

    // Create a filename with timestamp and specialty
    const filename = `${timestamp}-${specialty.replace(/\s+/g, '-').toLowerCase()}.json`;
    const filepath = path.join(reportsDir, filename);

    // Save the report data
    const reportData = {
      findings,
      report,
      specialty,
      timestamp,
      id: filename.replace('.json', '')
    };

    await fs.writeFile(filepath, JSON.stringify(reportData, null, 2));

    return Response.json({ success: true, id: reportData.id });
  } catch (error) {
    console.error('Error saving report:', error);
    return Response.json({ error: 'Failed to save report' }, { status: 500 });
  }
}
