# Architecture

## System Overview

The application follows a **pipeline architecture** with a central orchestrator coordinating six independent subsystems.

```
┌─────────────────────────────────────────────────────┐
│                    CLI (Typer)                       │
│  login | scan | process | resume | export | status  │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│               Orchestrator                           │
│  Pipeline coordination, progress, checkpoint/resume  │
└──┬────┬────┬────┬────┬────┬─────────────────────────┘
   │    │    │    │    │    │
   ▼    ▼    ▼    ▼    ▼    ▼
┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐
│Brow││Audi││Visu││ AI ││Expo││Data│
│ser ││o   ││al  ││Note││rt  ││base│
│Auto││Pipe││Pipe││Gen ││Eng ││    │
└────┘└────┘└────┘└────┘└────┘└────┘
```

## Component Details

### Browser Automation (`browser/`)
- **session.py**: Playwright persistent context with login detection
- **course_scanner.py**: DOM-based curriculum extraction
- **lecture_navigator.py**: Video playback control and screenshot capture

### Audio Pipeline (`audio/`)
- **capture.py**: Caption extraction (DOM) or audio loopback recording
- **processor.py**: Normalization, silence removal, chunking (pydub)
- **transcriber.py**: Faster-Whisper with GPU auto-detection

### Visual Pipeline (`visual/`)
- **frame_extractor.py**: Screenshot loading and preprocessing
- **slide_detector.py**: SSIM-based transition detection with deduplication
- **ocr_engine.py**: EasyOCR with region classification
- **code_detector.py**: Code extraction, language ID, duplicate merging

### AI Note Generator (`ai/`)
- **schemas.py**: Pydantic output models (20+ sections)
- **prompts.py**: System prompt, note generation, ML enhancement
- **note_generator.py**: LangChain structured output with chunked processing

### Export Engine (`export/`)
- **markdown_writer.py**: Notes, transcript, flashcards, quiz
- **pdf_writer.py**: Markdown → HTML → PDF via WeasyPrint
- **templates/**: CSS themes for PDF styling

### Core (`core/`)
- **config.py**: Pydantic settings from YAML + env vars
- **models.py**: Domain models (Course, Lecture, Transcript, etc.)
- **database.py**: SQLite progress tracking and metadata
- **orchestrator.py**: Central pipeline coordinator

## Data Flow

```
Udemy Course URL
    │
    ▼
[Browser Session] → Login verification
    │
    ▼
[Course Scanner] → Course model (sections, lectures)
    │
    ▼ (for each lecture)
    │
    ├── [Lecture Navigator] → Navigate to lecture
    │       │
    │       ├── Play video → [Screenshot Capture] → PNG files
    │       │
    │       └── [Caption Extract] → Raw caption data
    │
    ├── [Frame Extractor] → Loaded frames
    │       │
    │       └── [Slide Detector] → Unique slides
    │               │
    │               └── [OCR Engine] → Text regions
    │                       │
    │                       └── [Code Detector] → Code blocks
    │
    ├── [Audio Capture] → Transcript
    │
    ├── [Note Generator] → LectureNotes (structured)
    │       │
    │       ├── Transcript + OCR + Code → LLM prompt
    │       │
    │       └── Structured output → Validated Pydantic model
    │
    └── [Export Engine]
            │
            ├── notes.md + notes.pdf
            ├── transcript.md
            ├── flashcards.md
            ├── quiz.md
            ├── code/*.py
            └── metadata.json
```

## Design Principles

1. **Modularity**: Each component is independent and testable
2. **Configuration-Driven**: All behavior configurable via YAML
3. **Checkpoint/Resume**: SQLite-backed progress survives crashes
4. **Type Safety**: Pydantic models throughout
5. **Lazy Loading**: Heavy models (Whisper, OCR) loaded on demand
6. **Error Isolation**: Individual lecture failures don't stop the pipeline
