'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MEDICAL_SPECIALTIES } from '@/lib/constants';

// Medical terminology for improved recognition
const MEDICAL_TERMS = [
  'patient', 'diagnosis', 'treatment', 'symptoms', 'prognosis',
  'hypertension', 'diabetes', 'cardiac', 'respiratory', 'neurological',
  'assessment', 'examination', 'prescription', 'medication', 'therapy',
  'chronic', 'acute', 'bilateral', 'malignant', 'benign',
  'anterior', 'posterior', 'lateral', 'medial', 'proximal', 'distal'
];

const TranscriptionDialog = ({ webSpeechText, whisperText, onUseWhisper, onKeepCurrent, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Transcription Differences Detected</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="border rounded p-4">
            <h4 className="font-medium mb-2">Web Speech API</h4>
            <p className="whitespace-pre-wrap">{webSpeechText}</p>
          </div>
          
          <div className="border rounded p-4 bg-blue-50">
            <h4 className="font-medium mb-2">Whisper API (More Accurate)</h4>
            <p className="whitespace-pre-wrap">{whisperText}</p>
          </div>
        </div>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onUseWhisper}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Use Whisper Version
          </button>
          <button
            onClick={onKeepCurrent}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
          >
            Keep Current Version
          </button>
        </div>
      </div>
    </div>
  );
};

export default function MedicalReportGenerator() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get('id');
  
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState({ id: 'default', name: 'Default Prompt' });
  const [selectedPromptData, setSelectedPromptData] = useState(null);
  const [findings, setFindings] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [report, setReport] = useState('');
  const [specialty, setSpecialty] = useState('General');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [originalFindings, setOriginalFindings] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isManualPromptSelection, setIsManualPromptSelection] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [lastInterimEnd, setLastInterimEnd] = useState(0);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [showTranscriptionDialog, setShowTranscriptionDialog] = useState(false);
  const [whisperText, setWhisperText] = useState('');
  const [currentWebSpeechText, setCurrentWebSpeechText] = useState('');
  const [micButtonState, setMicButtonState] = useState('idle'); // 'idle', 'recording', 'processing'
  const [visualFeedback, setVisualFeedback] = useState('');

  // Refs for audio visualization
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const animationFrameRef = useRef(null);
  const canvasRef = useRef(null);
  const textareaRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    // Initialize speech recognition with enhanced settings
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new webkitSpeechRecognition();
      
      // Enhanced recognition settings
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      recognition.lang = 'en-US';

      // Add medical terms to recognition grammar if supported
      if ('SpeechGrammarList' in window) {
        const grammarList = new window.SpeechGrammarList();
        const terms = MEDICAL_TERMS.join(' | ');
        const grammar = '#JSGF V1.0; grammar medical; public <medical> = ' + terms + ';';
        grammarList.addFromString(grammar, 1);
        recognition.grammars = grammarList;
      }

      recognition.onresult = async (event) => {
        let finalTranscript = '';
        let currentInterim = '';

        // Get cursor position
        const textarea = textareaRef.current;
        const cursorPosition = textarea?.selectionStart || lastInterimEnd;

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
            const processedTranscript = postProcessTranscript(transcript);
            finalTranscript += processedTranscript;
            
            // Send to Whisper API for verification
            if (mediaRecorderRef.current && audioChunksRef.current.length > 0) {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
              const whisperResult = await sendToWhisper(audioBlob);
              
              if (whisperResult && whisperResult !== processedTranscript) {
                setCurrentWebSpeechText(processedTranscript);
                setWhisperText(whisperResult);
                setShowTranscriptionDialog(true);
                return; // Wait for user choice
              }
            }
            
            // If no Whisper result or they're the same, proceed with Web Speech
            setFindings(prev => {
              const beforeCursor = prev.slice(0, cursorPosition);
              const afterCursor = prev.slice(cursorPosition);
              return beforeCursor + finalTranscript + afterCursor;
            });
            
            setLastInterimEnd(cursorPosition + finalTranscript.length);
          } else {
            currentInterim += transcript;
          }
        }

        if (!finalTranscript) {
          setInterimTranscript(currentInterim);
        }
      };

      // Initialize audio context with noise reduction
      const initializeAudio = async () => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;

        const noiseFilter = audioContext.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 100;

        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1
            }
          });

          const microphone = audioContext.createMediaStreamSource(stream);
          microphone.connect(noiseFilter);
          noiseFilter.connect(analyser);
          
          return { audioContext, analyser, stream };
        } catch (err) {
          console.error('Error accessing microphone:', err);
          setError('Error accessing microphone: ' + err.message);
          return null;
        }
      };

      recognition.onstart = async () => {
        setIsRecording(true);
        setMicButtonState('recording');
        setVisualFeedback('Recording...');
        const audio = await initializeAudio();
        if (audio) {
          setAudioContext(audio.audioContext);
          setAnalyser(audio.analyser);
        }
      };

      recognition.onerror = (event) => {
        setIsRecording(false);
        setMicButtonState('idle');
        setVisualFeedback(`Error: ${event.error}`);
        setTimeout(() => setVisualFeedback(''), 3000);
        let errorMessage = 'Speech recognition error: ';
        
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
        
        setError(errorMessage);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setIsRecording(false);
        setMicButtonState('idle');
        setVisualFeedback('');
        setInterimTranscript('');
        if (audioContext) {
          audioContext.close();
          setAudioContext(null);
          setAnalyser(null);
        }
      };

      setRecognition(recognition);
    }
  }, [lastInterimEnd, audioContext]);

  // Post-process transcript for better accuracy
  const postProcessTranscript = (transcript) => {
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
  };

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (microphoneRef.current) {
        microphoneRef.current.disconnect();
      }
    };
  }, []);

  // Draw audio wave function
  const drawWave = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteTimeDomainData(dataArray);

      ctx.fillStyle = 'rgb(255, 255, 255)';
      ctx.fillRect(0, 0, width, height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgb(99, 102, 241)'; // Indigo color
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
    };

    draw();
  };

  // Handle recording toggle
  const toggleRecording = async () => {
    if (!recognition) {
      setError('Speech recognition is not supported in your browser');
      return;
    }

    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
        
        // Set up MediaRecorder with specific MIME type
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
          audioBitsPerSecond: 128000
        });
        
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        
        mediaRecorder.start(1000); // Collect data every second
        
        // Set up audio visualization
        microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
        microphoneRef.current.connect(analyserRef.current);
        drawWave();
        
        recognition.start();
      } catch (err) {
        console.error('Error accessing microphone:', err);
        setError('Error accessing microphone: ' + err.message);
      }
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (microphoneRef.current) {
        microphoneRef.current.disconnect();
        microphoneRef.current = null;
      }
      recognition.stop();
    }
    setIsRecording(!isRecording);
  };

  // Load existing report if editing
  useEffect(() => {
    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  useEffect(() => {
    fetchPrompts();
  }, []);

  useEffect(() => {
    if (prompts.length > 0 && !isManualPromptSelection) {
      // Only auto-select default prompt if user hasn't manually chosen one
      const defaultPrompt = prompts.find(p => p.isDefault && p.specialty === specialty);
      if (defaultPrompt) {
        setSelectedPrompt(defaultPrompt);
      } else {
        setSelectedPrompt({ id: 'default', name: 'Default Prompt' });
      }
    }
  }, [specialty, prompts, isManualPromptSelection]);

  useEffect(() => {
    if (prompts.length > 0 && selectedPrompt.id && selectedPrompt.id !== 'default') {
      const promptData = prompts.find(p => p.id === selectedPrompt.id);
      console.log('Selected prompt data:', promptData);
      setSelectedPromptData(promptData);
    } else {
      setSelectedPromptData(null);
    }
  }, [selectedPrompt, prompts]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reports/${reportId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch report');
      }

      // Set report data
      setFindings(data.findings);
      setReport(data.report);
      setSpecialty(data.specialty);
      setOriginalFindings(data.findings);
      
      // Set prompt if it exists
      if (data.prompt_id) {
        setSelectedPrompt({ id: data.prompt_id });
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrompts = async () => {
    setError('');
    try {
      const response = await fetch('/api/prompts');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch prompts');
      }
      
      console.log('Fetched prompts:', data.prompts);
      // Map the fields to ensure consistent casing
      const mappedPrompts = data.prompts.map(prompt => ({
        ...prompt,
        promptText: prompt.prompttext || prompt.promptText, // handle both cases
        isDefault: prompt.isdefault || prompt.isDefault,
        createdAt: prompt.createdat || prompt.createdAt
      }));
      console.log('Mapped prompts:', mappedPrompts);
      setPrompts(mappedPrompts);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      setError('Failed to load prompts');
    }
  };

  const safeSetReport = (reportData) => {
    try {
      if (typeof reportData === 'string') {
        setReport(reportData);
      } else if (reportData && typeof reportData === 'object') {
        // If it's an object with originalFindings and generatedReport
        if (reportData.generatedReport) {
          setReport(reportData.generatedReport);
        } else if (reportData.report && typeof reportData.report === 'string') {
          setReport(reportData.report);
        } else {
          // Last resort: try to stringify the object
          setReport(JSON.stringify(reportData));
        }
      } else {
        setReport('');
      }
    } catch (error) {
      console.error('Error setting report:', error);
      setReport('Error: Could not process report data');
    }
  };

  const handleGenerateReport = async () => {
    if (!findings) {
      setError('Please enter medical findings');
      return;
    }

    setLoading(true);
    setError('');
    setSaveSuccess(false);
    setReport(''); // Clear existing report

    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          findings: findings,
          promptId: selectedPrompt?.id === 'default' ? null : selectedPrompt?.id,
          specialty: specialty || 'General'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate report');
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullReport = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          
          const data = line.slice(6); // Remove 'data: ' prefix
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullReport += parsed.content;
              setReport(fullReport); // Update UI with accumulated report
            }
          } catch (e) {
            console.error('Error parsing SSE message:', e);
          }
        }
      }

    } catch (error) {
      console.error('Error generating report:', error);
      setError(error.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReport = async () => {
    if (!report) {
      setError('Please generate a report first');
      return;
    }

    setIsSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      const url = reportId ? `/api/reports/${reportId}` : '/api/reports/save';
      const response = await fetch(url, {
        method: reportId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          findings: findings,
          report: report, // Changed from content to report to match the API expectation
          specialty: specialty || 'General',
          promptId: selectedPrompt?.id === 'default' ? null : selectedPrompt?.id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save report');
      }

      // Update report ID if this is a new report
      if (!reportId && data.report?.id) {
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('id', data.report.id);
        window.history.pushState({}, '', newUrl);
      }

      setSuccessMessage('Report saved successfully!');
      setSaveSuccess(true);
      setTimeout(() => {
        setSuccessMessage('');
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Failed to save report');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefine = async () => {
    setIsRefining(true);
    setError('');

    try {
      const selectedPromptData = prompts.find(p => p.id === selectedPrompt.id);
      const response = await fetch('/api/reports/refine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          findings: originalFindings,
          originalReport: report,
          userEdits: report,
          promptText: selectedPromptData?.promptText,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to refine report');
      }

      safeSetReport(data.report);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Failed to refine report');
    } finally {
      setIsRefining(false);
    }
  };

  const handleSpecialtyChange = (e) => {
    const newSpecialty = e.target.value;
    setSpecialty(newSpecialty);
    
    // Find default prompt for new specialty
    const defaultPrompt = prompts.find(p => p.isDefault && p.specialty === newSpecialty);
    if (defaultPrompt) {
      setSelectedPrompt(defaultPrompt);
    }
  };

  const handlePromptChange = (prompt) => {
    setSelectedPrompt(prompt);
    setIsManualPromptSelection(true); // Mark that user has manually selected a prompt
  };

  const resetForm = () => {
    setFindings('');
    setReport('');
    setError('');
    setSaveSuccess(false);
    setOriginalFindings('');
    setIsRefining(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(report);
    setError('Report copied to clipboard!');
    setTimeout(() => setError(''), 3000);
  };

  const convertToMono16kHz = async (audioBuffer) => {
    const offlineCtx = new OfflineAudioContext({
      numberOfChannels: 1,
      length: audioBuffer.duration * 16000,
      sampleRate: 16000,
    });

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();

    const monoBuffer = await offlineCtx.startRendering();
    const audioData = monoBuffer.getChannelData(0);
  
    // Convert to 16-bit PCM WAV
    const wavBuffer = new ArrayBuffer(44 + audioData.length * 2);
    const view = new DataView(wavBuffer);
  
    // WAV header
    const writeString = (view, offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + audioData.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true);
    view.setUint32(28, 32000, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, audioData.length * 2, true);

    // Write audio data
    for (let i = 0; i < audioData.length; i++) {
      const s = Math.max(-1, Math.min(1, audioData[i]));
      view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([wavBuffer], { type: 'audio/wav' });
  };

  const sendToWhisper = async (audioBlob) => {
    try {
      console.log('Converting audio to WAV format...');
      
      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to mono 16kHz WAV
      const wavBlob = await convertToMono16kHz(audioBuffer);
      console.log('Audio converted successfully');
      
      const formData = new FormData();
      formData.append('audio', wavBlob, 'recording.wav');

      console.log('Sending to Whisper API...');
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to transcribe audio');
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('Error transcribing with Whisper:', error);
      setError('Failed to transcribe with Whisper API: ' + error.message);
      return null;
    }
  };

  const handleUseWhisper = () => {
    const cursorPosition = textareaRef.current?.selectionStart || lastInterimEnd;
    
    setFindings(prev => {
      const beforeCursor = prev.slice(0, cursorPosition);
      const afterCursor = prev.slice(cursorPosition);
      return beforeCursor + whisperText + afterCursor;
    });
    
    setLastInterimEnd(cursorPosition + whisperText.length);
    setShowTranscriptionDialog(false);
    setWhisperText('');
    setCurrentWebSpeechText('');
  };

  const handleKeepCurrent = () => {
    const cursorPosition = textareaRef.current?.selectionStart || lastInterimEnd;
    
    setFindings(prev => {
      const beforeCursor = prev.slice(0, cursorPosition);
      const afterCursor = prev.slice(cursorPosition);
      return beforeCursor + currentWebSpeechText + afterCursor;
    });
    
    setLastInterimEnd(cursorPosition + currentWebSpeechText.length);
    setShowTranscriptionDialog(false);
    setWhisperText('');
    setCurrentWebSpeechText('');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {showTranscriptionDialog && (
        <TranscriptionDialog
          webSpeechText={currentWebSpeechText}
          whisperText={whisperText}
          onUseWhisper={handleUseWhisper}
          onKeepCurrent={handleKeepCurrent}
          onClose={() => setShowTranscriptionDialog(false)}
        />
      )}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-white">Medical Report Generator</h1>
              <div className="flex space-x-4">
                {saveSuccess && (
                  <button
                    onClick={resetForm}
                    className="bg-white text-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors duration-200 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    New Report
                  </button>
                )}
                <Link
                  href="/dashboard"
                  className="bg-white text-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors duration-200 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  Dashboard
                </Link>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className={`px-4 py-3 rounded-md ${
                error.includes('success') ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'
              }`}>
                {error}
              </div>
            )}
            {successMessage && (
              <div className="px-4 py-3 rounded-md bg-green-50 text-green-600 border border-green-200">
                {successMessage}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
                <div>
                  <label className="block text-lg font-medium text-gray-900 mb-2">
                    System Prompt
                  </label>
                  <div className="flex items-center space-x-4">
                    <select
                      value={selectedPrompt?.id || 'default'}
                      onChange={(e) => {
                        const selected = prompts.find(p => p.id === e.target.value) || { id: 'default', name: 'Default Prompt' };
                        handlePromptChange(selected);
                      }}
                      className="w-full p-2 border rounded"
                    >
                      <option value="default">Default Prompt</option>
                      {prompts && prompts.length > 0 ? (
                        prompts.map(prompt => (
                          <option key={prompt.id} value={prompt.id}>
                            {prompt.name} ({prompt.specialty})
                          </option>
                        ))
                      ) : null}
                    </select>
                  </div>
                </div>

                {selectedPromptData && (
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {selectedPromptData.name}
                      </h3>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {selectedPromptData.specialty}
                      </span>
                    </div>
                    <div className="prose prose-blue max-w-none">
                      <pre className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed bg-transparent border-none p-0">
                        {selectedPromptData.promptText}
                      </pre>
                      {!selectedPromptData.promptText && (
                        <p className="text-red-600">No prompt content available</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specialty
                    </label>
                    <select
                      value={specialty}
                      onChange={handleSpecialtyChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {MEDICAL_SPECIALTIES.map(spec => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>
                  </div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medical Findings
                  </label>
                  <div className="relative mt-1">
                    <div className="relative">
                      <textarea
                        ref={textareaRef}
                        rows={12}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="Enter or dictate medical findings..."
                        value={findings}
                        onChange={(e) => {
                          setFindings(e.target.value);
                          setLastInterimEnd(e.target.selectionStart);
                        }}
                      />
                      {isRecording && interimTranscript && (
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gray-50 text-gray-500 text-sm border-t">
                          {interimTranscript}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={toggleRecording}
                        disabled={micButtonState === 'processing'}
                        className={`absolute right-2 top-2 p-2 rounded-full transition-all duration-200 ${
                          micButtonState === 'idle'
                            ? 'bg-white hover:bg-gray-100'
                            : micButtonState === 'recording'
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-gray-200'
                        }`}
                        title={isRecording ? 'Stop Dictation' : 'Start Dictation'}
                      >
                        <div className="relative">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-5 w-5 transition-transform duration-200 ${
                              micButtonState === 'recording' ? 'text-white scale-110' : 'text-gray-700'
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                            />
                          </svg>
                          {micButtonState === 'recording' && (
                            <span className="absolute -top-1 -right-1 w-2 h-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                          )}
                        </div>
                      </button>
                      {isRecording && (
                        <div className="absolute -bottom-20 left-0 right-0 h-16 bg-white border border-gray-200 rounded-md overflow-hidden">
                          <canvas
                            ref={canvasRef}
                            className="w-full h-full"
                            width={800}
                            height={64}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Generated Report
                  </label>
                  <textarea
                    value={report}
                    onChange={(e) => setReport(e.target.value)}
                    rows={12}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono"
                    placeholder="AI-generated report will appear here..."
                  />
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleGenerateReport}
                      disabled={!findings || loading}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          Generate Report
                        </>
                      )}
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                    <button
                      onClick={handleRefine}
                      disabled={isRefining || !report}
                      className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                    >
                      {isRefining ? (
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        'Refine'
                      )}
                    </button>
                    <button
                      onClick={handleSaveReport}
                      disabled={isSaving || !report}
                      className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                    >
                      {isSaving ? (
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        'Save'
                      )}
                    </button>
                    <button
                      onClick={copyToClipboard}
                      disabled={!report}
                      className="bg-purple-600 text-white px-3 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <div className="fixed top-6 right-6 flex flex-col gap-2">
        {interimTranscript && (
          <div className="bg-gray-800 bg-opacity-90 text-white p-4 rounded-lg max-w-md">
            <div className="text-sm font-medium mb-1">Transcribing...</div>
            <div className="text-xs opacity-90">{interimTranscript}</div>
          </div>
        )}
        {loading && (
          <div className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </div>
        )}
      </div>
      <div className="fixed bottom-6 left-6 flex flex-col gap-2">
        {error && (
          <div className="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg max-w-md animate-fade-in">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}
        {successMessage && (
          <div className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg max-w-md animate-fade-in">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {successMessage}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
