import fs from 'fs/promises';
import path from 'path';

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const reportsDir = path.join(process.cwd(), 'reports');
    
    // Find the report file
    const files = await fs.readdir(reportsDir);
    const reportFile = files.find(file => file.startsWith(id));
    
    if (!reportFile) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }
    
    // Delete the file
    await fs.unlink(path.join(reportsDir, reportFile));
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting report:', error);
    return Response.json({ error: 'Failed to delete report' }, { status: 500 });
  }
}
