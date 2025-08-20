// Voice Transcription Web App with real Whisper AI
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

// Configure Transformers.js for web environment
env.allowRemoteModels = true;
env.allowLocalModels = false;

class VoiceTranscriptionApp {
  constructor() {
    this.transcriber = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.isModelLoading = false;
    this.startTime = null;
    this.timerInterval = null;
    
    this.initializeElements();
    this.setupEventListeners();
    this.initializeModel();
  }
  
  initializeElements() {
    this.recordButton = document.getElementById('recordButton');
    this.buttonText = document.getElementById('buttonText');
    this.recordIcon = document.querySelector('.record-icon');
    this.stopIcon = document.querySelector('.stop-icon');
    this.status = document.getElementById('status');
    this.waveform = document.getElementById('waveform');
    this.timer = document.getElementById('timer');
    this.progressBar = document.getElementById('progressBar');
    this.progressFill = document.getElementById('progressFill');
    this.transcriptionText = document.getElementById('transcriptionText');
    this.copyButton = document.getElementById('copyButton');
    this.modelSelect = document.getElementById('modelSelect');
    this.languageSelect = document.getElementById('languageSelect');
    this.errorDiv = document.getElementById('errorDiv');
    this.themeToggle = document.getElementById('themeToggle');
    this.sunIcon = document.querySelector('.sun-icon');
    this.moonIcon = document.querySelector('.moon-icon');
  }
  
  setupEventListeners() {
    this.recordButton.addEventListener('click', () => this.toggleRecording());
    this.copyButton.addEventListener('click', () => this.copyToClipboard());
    this.modelSelect.addEventListener('change', () => this.onModelChange());
    this.themeToggle.addEventListener('click', () => this.toggleTheme());
    
    // Initialize theme
    this.initializeTheme();
  }
  
  async initializeModel() {
    try {
      this.updateStatus('Loading Whisper AI model...', 'loading');
      this.showProgress(0);
      
      const modelName = this.getModelName(this.modelSelect.value);
      
      this.transcriber = await pipeline('automatic-speech-recognition', modelName, {
        progress_callback: (progress) => {
          if (progress.status === 'progress') {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            this.updateStatus(`Loading ${modelName}: ${percent}%`, 'loading');
            this.showProgress(percent);
          }
        }
      });
      
      this.hideProgress();
      this.updateStatus('Ready to record! Click the button to start.', 'ready');
      console.log('Whisper model loaded successfully:', modelName);
      
    } catch (error) {
      console.error('Model loading failed:', error);
      this.showError('Failed to load AI model. Please refresh and try again.');
      this.updateStatus('Model loading failed', 'error');
    }
  }
  
  getModelName(size) {
    const models = {
      'tiny': 'Xenova/whisper-tiny',
      'base': 'Xenova/whisper-base',
      'small': 'Xenova/whisper-small'
    };
    return models[size] || models['base'];
  }
  
  async toggleRecording() {
    if (!this.isRecording) {
      await this.startRecording();
    } else {
      await this.stopRecording();
    }
  }
  
  async startRecording() {
    try {
      if (!this.transcriber) {
        this.showError('AI model not loaded yet. Please wait...');
        return;
      }
      
      this.hideError();
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });
      
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        await this.processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;
      
      // Update UI
      this.buttonText.textContent = 'Stop Recording';
      this.recordButton.classList.add('recording');
      this.recordIcon.style.display = 'none';
      this.stopIcon.style.display = 'block';
      this.waveform.classList.add('active');
      this.timer.classList.add('active');
      this.updateStatus('Recording... Speak clearly into your microphone.', 'recording');
      
      // Start timer
      this.startTime = Date.now();
      this.updateTimer();
      this.timerInterval = setInterval(() => this.updateTimer(), 100);
      
      // Auto-stop after 5 minutes
      setTimeout(() => {
        if (this.isRecording) {
          this.stopRecording();
        }
      }, 300000);
      
    } catch (error) {
      console.error('Recording failed:', error);
      this.showError('Failed to start recording. Please ensure microphone permission is granted.');
    }
  }
  
  async stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      // Update UI
      this.buttonText.textContent = 'Start Recording';
      this.recordButton.classList.remove('recording');
      this.recordIcon.style.display = 'block';
      this.stopIcon.style.display = 'none';
      this.waveform.classList.remove('active');
      this.timer.classList.remove('active');
      
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      
      this.updateStatus('Processing audio...', 'processing');
    }
  }
  
  async processAudio(audioBlob) {
    try {
      this.showProgress(0);
      this.updateStatus('Converting audio format...', 'processing');
      
      // Convert to the format expected by Whisper
      const audioUrl = URL.createObjectURL(audioBlob);
      
      this.updateStatus('Running AI transcription...', 'processing');
      this.showProgress(50);
      
      const result = await this.transcriber(audioUrl, {
        language: this.languageSelect.value === 'auto' ? null : this.languageSelect.value,
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: false
      });
      
      URL.revokeObjectURL(audioUrl);
      
      const transcription = result.text || 'No speech detected';
      
      this.hideProgress();
      this.displayTranscription(transcription);
      this.updateStatus('Transcription complete!', 'completed');
      
      console.log('Transcription result:', transcription);
      
    } catch (error) {
      console.error('Transcription failed:', error);
      this.showError(`Transcription failed: ${error.message}`);
      this.updateStatus('Transcription failed', 'error');
      this.hideProgress();
    }
  }
  
  displayTranscription(text) {
    this.transcriptionText.textContent = text;
    this.transcriptionText.classList.remove('empty');
  }
  
  async copyToClipboard() {
    const text = this.transcriptionText.textContent;
    
    if (!text || this.transcriptionText.classList.contains('empty')) {
      return;
    }
    
    try {
      await navigator.clipboard.writeText(text);
      
      const originalText = this.copyButton.querySelector('span').textContent;
      this.copyButton.querySelector('span').textContent = 'Copied!';
      this.copyButton.classList.add('copied');
      
      setTimeout(() => {
        this.copyButton.querySelector('span').textContent = originalText;
        this.copyButton.classList.remove('copied');
      }, 2000);
      
    } catch (error) {
      console.error('Copy failed:', error);
      this.showError('Failed to copy to clipboard');
    }
  }
  
  updateTimer() {
    if (!this.startTime) return;
    
    const elapsed = Date.now() - this.startTime;
    const seconds = Math.floor(elapsed / 1000) % 60;
    const minutes = Math.floor(elapsed / 60000);
    
    this.timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  updateStatus(message, type) {
    this.status.textContent = message;
    this.status.className = `status ${type}`;
  }
  
  showProgress(percent) {
    this.progressBar.classList.add('active');
    this.progressFill.style.width = `${percent}%`;
  }
  
  hideProgress() {
    this.progressBar.classList.remove('active');
  }
  
  showError(message) {
    this.errorDiv.textContent = message;
    this.errorDiv.classList.add('active');
  }
  
  hideError() {
    this.errorDiv.classList.remove('active');
  }
  
  async onModelChange() {
    if (this.isModelLoading) return;
    
    this.isModelLoading = true;
    this.transcriber = null;
    
    await this.initializeModel();
    
    this.isModelLoading = false;
  }
  
  initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);
  }
  
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    this.updateThemeIcon(newTheme);
  }
  
  updateThemeIcon(theme) {
    if (theme === 'light') {
      this.sunIcon.style.display = 'block';
      this.moonIcon.style.display = 'none';
    } else {
      this.sunIcon.style.display = 'none';
      this.moonIcon.style.display = 'block';
    }
  }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new VoiceTranscriptionApp();
});

console.log('Voice Transcription App loaded');