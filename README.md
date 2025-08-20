# Speak

AI-powered speech-to-text transcription that runs entirely in your browser using OpenAI's Whisper models.

## Features

- **Real AI Transcription** - Uses Whisper models for accurate speech recognition
- **Privacy-First** - All processing happens locally, no data sent to servers
- **Multiple Models** - Choose between Whisper Tiny, Base, or Small for speed vs accuracy
- **Multi-Language** - Supports English, Spanish, French, German, and auto-detection
- **Light/Dark Themes** - Modern neumorphic design with theme switching
- **One-Click Copy** - Instantly copy transcriptions to clipboard

## Usage

1. Open the app and grant microphone permission
2. Wait for the AI model to download (30-60 seconds first time)
3. Click record, speak clearly, then stop
4. Copy your transcription to clipboard

## Local Development

```bash
# Clone and serve
git clone https://github.com/mbarlow/speak.git
cd speak
python3 -m http.server 8080
```

Open `http://localhost:8080`

## Technology

Built with vanilla JavaScript, Transformers.js for Whisper AI, and modern CSS. No frameworks, no build process, no nonsense. ;D

## License

MIT
