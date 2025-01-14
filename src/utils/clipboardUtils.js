import { marked } from 'marked';

// Configure marked for rich text output
marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: false,
  mangle: false,
});

function addStylesToHtml(html) {
  const styleMap = {
    'h1': 'font-size: 24px; font-weight: bold; margin: 16px 0;',
    'h2': 'font-size: 20px; font-weight: bold; margin: 14px 0;',
    'h3': 'font-size: 18px; font-weight: bold; margin: 12px 0;',
    'p': 'margin: 8px 0;',
    'ul': 'padding-left: 24px; margin: 8px 0;',
    'ol': 'padding-left: 24px; margin: 8px 0;',
    'li': 'margin: 4px 0;',
    'code': 'font-family: monospace; background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px;',
    'pre': 'background-color: #f5f5f5; padding: 12px; border-radius: 6px; margin: 8px 0; white-space: pre-wrap;',
    'blockquote': 'border-left: 4px solid #e2e8f0; padding-left: 16px; margin: 8px 0; font-style: italic;',
    'a': 'color: #3182ce; text-decoration: underline;',
    'table': 'border-collapse: collapse; width: 100%; margin: 8px 0;',
    'th': 'border: 1px solid #e2e8f0; padding: 8px; background-color: #f8fafc;',
    'td': 'border: 1px solid #e2e8f0; padding: 8px;',
  };

  // Create a temporary div to parse the HTML
  const div = document.createElement('div');
  div.innerHTML = html;

  // Add styles to each element
  Object.entries(styleMap).forEach(([tag, style]) => {
    const elements = div.getElementsByTagName(tag);
    for (let el of elements) {
      el.style.cssText += style;
    }
  });

  return div.innerHTML;
}

export async function copyFormattedContent(content) {
  try {
    // Convert markdown to HTML
    const html = marked(content);
    
    // Add inline styles for better compatibility
    const styledHtml = addStylesToHtml(html);
    
    // Wrap in a div with base styles
    const wrappedHtml = `
      <div style="color: #1a202c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.5;">
        ${styledHtml}
      </div>
    `;

    // Create rich text clipboard data
    const clipboardData = new ClipboardItem({
      'text/html': new Blob([wrappedHtml], { type: 'text/html' }),
      'text/plain': new Blob([content], { type: 'text/plain' })
    });

    await navigator.clipboard.write([clipboardData]);
    return true;
  } catch (error) {
    console.error('Error copying formatted content:', error);
    // Fallback to plain text
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch (fallbackError) {
      console.error('Fallback copy failed:', fallbackError);
      throw fallbackError;
    }
  }
}
