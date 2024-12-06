// Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Medical terminology and common words for improved recognition
const MEDICAL_TERMS = [
  'patient', 'diagnosis', 'treatment', 'symptoms', 'prognosis',
  'hypertension', 'diabetes', 'cardiac', 'respiratory', 'neurological',
  'assessment', 'examination', 'prescription', 'medication', 'therapy',
  'chronic', 'acute', 'bilateral', 'malignant', 'benign',
  'anterior', 'posterior', 'lateral', 'medial', 'proximal', 'distal'
];

console.log('Popup script loaded!');

// Store the original markdown text
let originalMarkdown = '';
let recognition = null;
let audioContext = null;
let analyser = null;
let microphone = null;
let animationFrame = null;
let noiseFilter = null;

// Initialize audio context and analyser with noise reduction
function initializeAudioAnalyser() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048; // Increased for better frequency resolution
    analyser.smoothingTimeConstant = 0.8; // Smoother transitions

    // Create noise reduction filter
    noiseFilter = audioContext.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 100; // Reduce low-frequency noise
  }
}

// Initialize speech recognition with enhanced settings
function initializeSpeechRecognition() {
  if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    
    // Enhanced recognition settings
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3; // Get multiple alternatives
    recognition.lang = 'en-US';

    // Add medical terms to recognition grammar if supported
    if ('SpeechGrammarList' in window) {
      const grammarList = new window.SpeechGrammarList();
      const terms = MEDICAL_TERMS.join(' | ');
      const grammar = '#JSGF V1.0; grammar medical; public <medical> = ' + terms + ';';
      grammarList.addFromString(grammar, 1);
      recognition.grammars = grammarList;
    }

    recognition.onstart = async () => {
      const dictateBtn = document.getElementById('dictate-btn');
      const statusDiv = document.getElementById('dictation-status');
      const waveContainer = document.getElementById('wave-container');
      
      dictateBtn.style.backgroundColor = '#ff4444';
      statusDiv.textContent = 'Listening...';
      waveContainer.classList.add('recording');

      // Start audio visualization with noise reduction
      try {
        if (!microphone) {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1
            }
          });
          
          microphone = audioContext.createMediaStreamSource(stream);
          microphone.connect(noiseFilter);
          noiseFilter.connect(analyser);
        }
        drawWave();
      } catch (err) {
        console.error('Error accessing microphone:', err);
      }
    };

    recognition.onend = () => {
      const dictateBtn = document.getElementById('dictate-btn');
      const statusDiv = document.getElementById('dictation-status');
      const waveContainer = document.getElementById('wave-container');
      const promptTextarea = document.getElementById('prompt');
      
      // Clean up any remaining interim text
      const content = promptTextarea.value;
      const lastIndex = content.lastIndexOf('[interim]');
      if (lastIndex !== -1) {
        promptTextarea.value = content.substring(0, lastIndex);
      }

      dictateBtn.style.backgroundColor = '#f8f9fa';
      statusDiv.textContent = '';
      waveContainer.classList.remove('recording');

      // Stop audio visualization
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      if (microphone) {
        microphone.disconnect();
        microphone = null;
      }
    };

    recognition.onresult = (event) => {
      const promptTextarea = document.getElementById('prompt');
      let interimTranscript = '';
      let finalTranscript = '';

      // Get the cursor position and content
      const cursorPosition = promptTextarea.selectionStart;
      const currentContent = promptTextarea.value;

      // Remove any previous interim results
      const lastIndex = currentContent.lastIndexOf('[interim]');
      const cleanContent = lastIndex !== -1 
        ? currentContent.substring(0, lastIndex)
        : currentContent;

      // Process results with confidence scoring
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        // Get the most confident result
        let bestAlternative = event.results[i][0];
        for (let j = 1; j < event.results[i].length; j++) {
          if (event.results[i][j].confidence > bestAlternative.confidence) {
            bestAlternative = event.results[i][j];
          }
        }

        const transcript = bestAlternative.transcript;
        
        if (event.results[i].isFinal) {
          // Post-process the transcript
          const processed = postProcessTranscript(transcript);
          finalTranscript += processed;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update the content
      if (finalTranscript) {
        const beforeCursor = cleanContent.slice(0, cursorPosition);
        const afterCursor = cleanContent.slice(cursorPosition);
        promptTextarea.value = beforeCursor + finalTranscript + afterCursor;
        
        const newPosition = cursorPosition + finalTranscript.length;
        promptTextarea.setSelectionRange(newPosition, newPosition);
      } else if (interimTranscript) {
        const beforeCursor = cleanContent.slice(0, cursorPosition);
        const afterCursor = cleanContent.slice(cursorPosition);
        promptTextarea.value = beforeCursor + '[interim]' + interimTranscript + afterCursor;
        
        promptTextarea.setSelectionRange(cursorPosition, cursorPosition);
      }
    };

    recognition.onerror = (event) => {
      const statusDiv = document.getElementById('dictation-status');
      let errorMessage = 'Error: ';
      
      switch (event.error) {
        case 'network':
          errorMessage += 'Network error occurred. Please check your connection.';
          break;
        case 'no-speech':
          errorMessage += 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage += 'Microphone not found or not working properly.';
          break;
        case 'not-allowed':
          errorMessage += 'Microphone access denied. Please allow microphone access.';
          break;
        default:
          errorMessage += event.error;
      }
      
      statusDiv.textContent = errorMessage;
      console.error('Speech recognition error:', event.error);
    };
  }
}

// Post-process transcript for better accuracy
function postProcessTranscript(transcript) {
  // Capitalize medical terms
  let processed = transcript;
  MEDICAL_TERMS.forEach(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    processed = processed.replace(regex, term.charAt(0).toUpperCase() + term.slice(1));
  });

  // Add proper spacing after punctuation
  processed = processed.replace(/([.,!?])(\w)/g, '$1 $2');
  
  // Capitalize first letter of sentences
  processed = processed.replace(/(^\w|[.!?]\s+\w)/g, letter => letter.toUpperCase());

  return processed;
}

// Draw audio wave
function drawWave() {
  const canvas = document.getElementById('wave-canvas');
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    animationFrame = requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);

    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(0, 123, 255)';
    ctx.beginPath();

    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * height / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }

  draw();
}

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
  
  // Initialize audio context and speech recognition
  initializeAudioAnalyser();
  initializeSpeechRecognition();

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
  const dictateBtn = document.getElementById('dictate-btn');

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
    copyBtn: !!copyBtn,
    dictateBtn: !!dictateBtn
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

  // Add dictation button handler
  if (dictateBtn && recognition) {
    let isRecording = false;
    
    dictateBtn.addEventListener('click', () => {
      if (!isRecording) {
        recognition.start();
      } else {
        recognition.stop();
      }
      isRecording = !isRecording;
    });
  } else if (dictateBtn) {
    dictateBtn.style.display = 'none';
    console.warn('Speech recognition not supported in this browser');
  }

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