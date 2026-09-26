# 🎓 Udemy AI Notes

**AI-Powered Udemy Course Note Generator** — Convert video lectures into comprehensive, university-level study notes for personal learning.

> ⚠️ **This tool is for personal study only.** It does not bypass DRM, download videos, or redistribute copyrighted content.

---

## ✨ Features

- **🌐 Browser Automation** — Playwright-based Udemy interaction with persistent login sessions
- **🎙️ Transcription** — Faster-Whisper speech-to-text with GPU acceleration
- **👁️ Visual Analysis** — OCR text extraction, slide detection, code recognition
- **🤖 AI Note Generation** — LLM-powered comprehensive notes (OpenAI, Google, Anthropic)
- **📄 Multi-Format Export** — Markdown + professionally styled PDF output
- **📊 Progress Tracking** — SQLite-backed checkpoint/resume system
- **⚡ CLI Interface** — 8 commands via Typer with Rich-formatted output

## 🏗️ Architecture

```
notes-ai scan → Browser scans course curriculum
notes-ai process → For each lecture:
    ├── 📸 Capture screenshots every N seconds
    ├── 📝 Extract captions/transcribe audio
    ├── 🔍 Detect unique slides (SSIM comparison)
    ├── 👁️ OCR text from slides
    ├── 💻 Detect & extract code blocks
    ├── 🤖 Generate AI notes (LLM)
    └── 📄 Export to Markdown + PDF
```

## 📦 Installation

### Prerequisites

- **Python 3.12+**
- An LLM API key (OpenAI, Google Gemini, or Anthropic)
- FFmpeg (optional, for audio processing)

### Setup

```bash
# Clone the repository
cd udemy_ai_notes

# Create virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium

# Install the package in development mode
pip install -e .
```

### Environment Variables

```bash
# Copy the example and add your API key
copy .env.example .env
# Edit .env with your preferred LLM provider API key
```

## 🚀 Quick Start

### 1. Login to Udemy

```bash
notes-ai login
```

A browser window opens — log into your Udemy account. The session is saved.

### 2. Scan a Course

```bash
notes-ai scan "https://www.udemy.com/course/your-course-name/"
```

Displays the full curriculum with sections, lectures, and durations.

### 3. Process Lectures

```bash
# Process all lectures
notes-ai process "https://www.udemy.com/course/your-course-name/"

# Process a single lecture
notes-ai process "https://www.udemy.com/course/your-course-name/" --lecture 5

# Start from lecture 10
notes-ai process "https://www.udemy.com/course/your-course-name/" --start-from 10
```

### 4. Check Progress

```bash
notes-ai status
```

### 5. Resume After Interruption

```bash
notes-ai resume
```

## 📁 Output Structure

```
output/
└── course-name/
    ├── lecture_01_introduction/
    │   ├── notes.md          # Comprehensive AI-generated notes
    │   ├── notes.pdf         # Professionally styled PDF
    │   ├── transcript.md     # Timestamped transcript
    │   ├── flashcards.md     # Spaced repetition cards
    │   ├── quiz.md           # Self-assessment quiz
    │   ├── code/             # Extracted code snippets
    │   ├── screenshots/      # Unique slide captures
    │   └── metadata.json     # Processing metadata
    └── lecture_02_basics/
        └── ...
```

## ⚙️ Configuration

Edit `config.yaml` to customize:

| Setting | Default | Description |
|---------|---------|-------------|
| `ai.provider` | `openai` | LLM provider (openai, google, anthropic) |
| `ai.model` | `gpt-4o` | Model name |
| `transcription.model_size` | `base` | Whisper model (tiny, base, small, medium, large-v3) |
| `visual.screenshot_interval_seconds` | `5` | Screenshot frequency |
| `visual.slide_similarity_threshold` | `0.85` | SSIM threshold for new slide detection |
| `audio.capture_method` | `captions` | How to get audio (captions or loopback) |
| `export.formats` | `[markdown, pdf]` | Output formats |

See `config.yaml` for all options.

## 📋 CLI Reference

| Command | Description |
|---------|-------------|
| `notes-ai login` | Open browser for Udemy login |
| `notes-ai scan <url>` | Scan course curriculum |
| `notes-ai process <url>` | Process lectures and generate notes |
| `notes-ai resume` | Resume from last checkpoint |
| `notes-ai export <url>` | Re-export notes |
| `notes-ai config` | Show current configuration |
| `notes-ai clean` | Remove cache/temp files |
| `notes-ai status` | Show processing progress |

## 🧪 Testing

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=notes_ai --cov-report=html
```

## 📖 Documentation

- [Installation Guide](docs/installation.md)
- [Usage Guide](docs/usage.md)
- [Architecture](docs/architecture.md)
- [Configuration](docs/configuration.md)

## 🛡️ Legal

This software is for **personal study use only**. It:
- ✅ Processes lectures you are authorized to view
- ✅ Uses your own browser session
- ❌ Does NOT bypass authentication or DRM
- ❌ Does NOT download or redistribute videos
- ❌ Does NOT upload copyrighted content

## 📄 License

MIT License — See LICENSE for details.
