# Installation Guide

## System Requirements

- **Python**: 3.12 or higher
- **OS**: Windows 10/11 (primary), macOS, Linux
- **RAM**: 8 GB minimum (16 GB recommended for large Whisper models)
- **Disk**: ~5 GB for dependencies + models
- **GPU**: Optional — NVIDIA GPU with CUDA for faster transcription

## Step-by-Step Installation

### 1. Python Environment

```bash
# Verify Python version
python --version  # Should be 3.12+

# Navigate to the project
cd udemy_ai_notes

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Install Playwright Browsers

```bash
playwright install chromium
```

### 4. Configure API Keys

```bash
copy .env.example .env
```

Edit `.env` and set your LLM provider API key:

```
OPENAI_API_KEY=sk-your-key-here
```

### 5. Install the CLI Tool

```bash
pip install -e .
```

### 6. Verify Installation

```bash
notes-ai --version
notes-ai --help
```

## Optional: GPU Setup

For faster Whisper transcription with NVIDIA GPU:

```bash
pip install torch --index-url https://download.pytorch.org/whl/cu121
```

Update `config.yaml`:
```yaml
transcription:
  device: "cuda"
  compute_type: "float16"
  model_size: "medium"  # or "large-v3" for best accuracy
```

## Optional: Audio Loopback (VB-CABLE)

If you want to capture audio directly instead of using Udemy's captions:

1. Download [VB-CABLE](https://vb-audio.com/Cable/)
2. Install the virtual audio cable driver
3. Set your system audio output to "CABLE Input"
4. Update `config.yaml`:
   ```yaml
   audio:
     capture_method: "loopback"
   ```

## Troubleshooting

### WeasyPrint Installation Issues (Windows)

WeasyPrint requires GTK libraries. Install via:
```bash
pip install weasyprint
```

If you encounter errors, install [GTK for Windows](https://github.com/nickvdyck/weasyprint-win64/releases).

### EasyOCR First Run

EasyOCR downloads language models on first use (~100 MB). Ensure internet connectivity.

### Playwright Browser Issues

```bash
playwright install --with-deps chromium
```
