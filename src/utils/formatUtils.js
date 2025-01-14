import TurndownService from 'turndown';
import { marked } from 'marked';

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: false
});

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '_',
});

// Configure turndown options
turndownService.addRule('emphasis', {
  filter: ['em', 'i'],
  replacement: function (content) {
    return '_' + content + '_';
  }
});

turndownService.addRule('strong', {
  filter: ['strong', 'b'],
  replacement: function (content) {
    return '**' + content + '**';
  }
});

export function formatMarkdownForClipboard(markdown) {
  // Convert markdown to HTML
  const html = marked(markdown);

  // Create a clipboard data object with both HTML and plain text
  const clipboardData = new ClipboardItem({
    'text/html': new Blob([html], { type: 'text/html' }),
    'text/plain': new Blob([markdown], { type: 'text/plain' }),
  });

  return clipboardData;
}

export function convertToRichText(markdown) {
  // Parse markdown to HTML using marked
  const html = marked(markdown);
  
  // Add any additional styling classes or modifications here
  const styledHtml = html
    .replace(/<h1>/g, '<h1 style="font-size: 2em; margin: 0.67em 0;">')
    .replace(/<h2>/g, '<h2 style="font-size: 1.5em; margin: 0.83em 0;">')
    .replace(/<h3>/g, '<h3 style="font-size: 1.17em; margin: 1em 0;">')
    .replace(/<p>/g, '<p style="margin: 1em 0;">')
    .replace(/<code>/g, '<code style="background-color: #f5f5f5; padding: 0.2em 0.4em; border-radius: 3px;">')
    .replace(/<pre>/g, '<pre style="background-color: #f5f5f5; padding: 1em; border-radius: 5px; overflow-x: auto;">');

  return styledHtml;
}
