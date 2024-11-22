import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const reportsDir = path.join(process.cwd(), 'reports');
    
    // Create directory if it doesn't exist
    await fs.mkdir(reportsDir, { recursive: true });
    
    // Read all report files
    const files = await fs.readdir(reportsDir);
    const reportFiles = files.filter(file => file.endsWith('.json'));
    
    // Read and parse each report file
    const reports = await Promise.all(
      reportFiles.map(async (file) => {
        const filePath = path.join(reportsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
      })
    );
    
    // Sort reports by timestamp, most recent first
    reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return Response.json({ reports });
  } catch (error) {
    console.error('Error listing reports:', error);
    return Response.json({ error: 'Failed to list reports' }, { status: 500 });
  }
}
