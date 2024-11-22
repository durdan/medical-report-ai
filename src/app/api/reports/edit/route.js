import fs from 'fs/promises';
import path from 'path';

export async function PUT(request) {
  try {
    const { id, findings, report, specialty } = await request.json();
    const reportsDir = path.join(process.cwd(), 'reports');
    
    // Find the report file
    const files = await fs.readdir(reportsDir);
    const reportFile = files.find(file => file.startsWith(id));
    
    if (!reportFile) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }
    
    const filePath = path.join(reportsDir, reportFile);
    const existingReport = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    
    // Update report data
    const updatedReport = {
      ...existingReport,
      findings,
      report,
      specialty,
      lastEdited: new Date().toISOString()
    };
    
    await fs.writeFile(filePath, JSON.stringify(updatedReport, null, 2));
    
    return Response.json({ success: true, report: updatedReport });
  } catch (error) {
    console.error('Error updating report:', error);
    return Response.json({ error: 'Failed to update report' }, { status: 500 });
  }
}
