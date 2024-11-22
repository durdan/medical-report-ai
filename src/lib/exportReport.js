export function exportToPDF(report) {
  // Create a blob with the report content
  const content = `
Medical Report
=============

Specialty: ${report.specialty}
Date: ${new Date(report.timestamp).toLocaleString()}
${report.lastEdited ? `Last Edited: ${new Date(report.lastEdited).toLocaleString()}` : ''}

FINDINGS:
${report.findings}

ASSESSMENT AND PLAN:
${report.report}
`;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  // Create a temporary link and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = `medical-report-${report.specialty.toLowerCase()}-${new Date(report.timestamp).toISOString().split('T')[0]}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToJSON(report) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `medical-report-${report.specialty.toLowerCase()}-${new Date(report.timestamp).toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
