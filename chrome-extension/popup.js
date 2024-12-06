// Configuration
const API_BASE_URL = 'http://localhost:3000/api';

console.log('Popup script loaded!');

// Store the original markdown text
let originalMarkdown = '';

// Simple markdown parser
function parseMarkdown(text) {
  try {
    // Replace headers
    text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // Replace bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace italic
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Replace lists
    text = text.replace(/^\- (.*$)/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    
    // Replace numbered lists
    text = text.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/gs, '<ol>$1</ol>');
    
    // Replace paragraphs
    text = text.replace(/^(?!<[uo]l|<li|<h[1-6])(.*$)/gm, '<p>$1</p>');
    
    console.log('Parsed markdown:', text);
    return text;
  } catch (error) {
    console.error('Error parsing markdown:', error);
    return text;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded');

  // Test marked library
  if (typeof marked !== 'undefined') {
    console.log('Testing marked with sample text...');
    const testMarkdown = '# Test\n## Working\n- List item';
    const testResult = parseMarkdown(testMarkdown);
    console.log('Test result:', testResult);
  }
  
  // Get all elements
  const loginSection = document.getElementById('login-section');
  const reportSection = document.getElementById('report-section');
  const loginBtn = document.getElementById('login-btn');
  const generateBtn = document.getElementById('generate-btn');
  const resultDiv = document.getElementById('result');
  const specialtySelect = document.getElementById('specialty');
  const promptTextarea = document.getElementById('prompt');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const copyBtn = document.getElementById('copy-btn');

  console.log('Initial elements found:', {
    loginSection: !!loginSection,
    reportSection: !!reportSection,
    loginBtn: !!loginBtn,
    generateBtn: !!generateBtn,
    resultDiv: !!resultDiv,
    specialtySelect: !!specialtySelect,
    promptTextarea: !!promptTextarea,
    emailInput: !!emailInput,
    passwordInput: !!passwordInput,
    copyBtn: !!copyBtn
  });

  // Add login button handler
  if (loginBtn) {
    loginBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log('Login button clicked!');

      const email = emailInput.value;
      const password = passwordInput.value;

      if (!email || !password) {
        resultDiv.textContent = 'Please enter both email and password';
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/callback/credentials`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email, 
            password,
            redirect: false,
            json: true
          }),
          credentials: 'include'
        });

        console.log('Login response status:', response.status);

        if (response.ok) {
          // Get session after login
          const sessionResponse = await fetch(`${API_BASE_URL}/auth/session`, {
            credentials: 'include'
          });
          
          if (sessionResponse.ok) {
            console.log('Session obtained successfully');
            loginSection.style.display = 'none';
            reportSection.style.display = 'block';
            console.log('Sections toggled:', {
              loginDisplay: loginSection.style.display,
              reportDisplay: reportSection.style.display
            });
          } else {
            resultDiv.textContent = 'Failed to get session after login';
          }
        } else {
          const error = await response.json();
          resultDiv.textContent = 'Login failed: ' + (error.message || 'Invalid credentials');
        }
      } catch (error) {
        console.error('Login error:', error);
        resultDiv.textContent = 'Login error: ' + error.message;
      }
    });
  }
  
  // Copy button functionality
  copyBtn.addEventListener('click', async () => {
    try {
      // Copy the original markdown text instead of rendered HTML
      await navigator.clipboard.writeText(originalMarkdown);
      
      // Visual feedback
      copyBtn.classList.add('copied');
      copyBtn.innerHTML = `
        <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5"></path>
        </svg>
        Copied Markdown!
      `;
      
      // Reset after 2 seconds
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.innerHTML = `
          <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copy as Markdown
        `;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  });

  // Add generate button handler
  async function handleGenerateReport(e) {
    e.preventDefault();
    console.log('Generate button clicked!');

    const specialty = specialtySelect.value;
    const prompt = promptTextarea.value;

    if (!specialty || !prompt) {
      resultDiv.innerHTML = parseMarkdown('**Error:** Please fill in all fields');
      return;
    }

    try {
      generateBtn.disabled = true;
      generateBtn.textContent = 'Generating...';
      resultDiv.innerHTML = parseMarkdown('*Generating report...*');
      
      const response = await fetch(`${API_BASE_URL}/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          findings: prompt,  
          specialty,
          promptId: 'default'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = '**Error generating report**\n\n';
        
        if (errorData.error?.includes('rate limit exceeded')) {
          errorMessage += '> The AI model is currently at capacity. Please try again in about an hour.';
        } else {
          errorMessage += `> ${errorData.error || 'Unknown error occurred'}`;
        }
        
        resultDiv.innerHTML = parseMarkdown(errorMessage);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullReport = '';

      while (true) {
        const { value, done } = await reader.read();
        
        if (done) {
          console.log('Stream complete');
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) {
            continue;
          }

          const data = line.slice(6); // Remove 'data: ' prefix
          
          if (data === '[DONE]') {
            console.log('Stream finished');
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullReport += parsed.content;
              // Store the original markdown
              originalMarkdown = fullReport;
              console.log('Current full report:', fullReport);
              
              // Use our custom markdown parser for display only
              resultDiv.innerHTML = parseMarkdown(fullReport);
              
              // Show copy button when we have content
              copyBtn.style.display = 'flex';
            }
          } catch (e) {
            console.error('Error parsing SSE message:', e);
            console.log('Raw message:', data);
            if (data.includes('rate limit exceeded')) {
              resultDiv.innerHTML = parseMarkdown('**Error:** The AI model is currently at capacity. Please try again in about an hour.');
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      resultDiv.innerHTML = parseMarkdown(`**Error:** ${error.message}`);
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate Report';
    }
  }

  // Attach generate handler
  if (generateBtn) {
    generateBtn.addEventListener('click', handleGenerateReport);
    console.log('Generate button handler attached');
  }
});