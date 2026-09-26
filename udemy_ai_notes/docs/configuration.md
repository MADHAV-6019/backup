# Configuration Reference

All settings are in `config.yaml`. Environment variables from `.env` override API keys.

## General

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `output_dir` | string | `./output` | Root directory for all output files |
| `language` | string | `en` | Language code for transcription and OCR |
| `log_level` | string | `INFO` | Logging level: DEBUG, INFO, WARNING, ERROR |
| `max_retries` | int | `3` | Retry count for failed operations |
| `retry_delay_seconds` | int | `5` | Delay between retries |

## Browser

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `headless` | bool | `false` | Run browser without GUI (for production) |
| `user_data_dir` | string | `./browser_data` | Directory for persistent session data |
| `viewport_width` | int | `1920` | Browser viewport width |
| `viewport_height` | int | `1080` | Browser viewport height |
| `timeout_ms` | int | `30000` | Navigation timeout |
| `slow_mo_ms` | int | `100` | Delay between browser actions |

## Audio

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `capture_method` | string | `captions` | `captions` (from Udemy UI) or `loopback` (system audio) |
| `chunk_duration_seconds` | int | `30` | Audio chunk size for transcription |
| `sample_rate` | int | `16000` | Audio sample rate in Hz |
| `normalize` | bool | `true` | Normalize audio volume |
| `remove_silence` | bool | `true` | Remove silent sections |
| `silence_threshold_db` | int | `-40` | Silence detection threshold |

## Transcription

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `model_size` | string | `base` | Whisper model: tiny, base, small, medium, large-v3 |
| `device` | string | `auto` | Compute device: auto, cpu, cuda |
| `compute_type` | string | `auto` | Quantization: auto, int8, float16, float32 |
| `beam_size` | int | `5` | Beam search width (higher = more accurate but slower) |
| `vad_filter` | bool | `true` | Voice Activity Detection filtering |
| `min_confidence` | float | `0.4` | Minimum transcription confidence |

## Visual / OCR

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `screenshot_interval_seconds` | int | `5` | Time between screenshot captures |
| `ocr_engine` | string | `easyocr` | OCR engine: easyocr or tesseract |
| `ocr_confidence_threshold` | float | `0.5` | Minimum OCR confidence |
| `slide_similarity_threshold` | float | `0.85` | SSIM threshold for new slide detection |
| `max_screenshots_per_lecture` | int | `200` | Maximum screenshots to capture |
| `image_quality` | int | `90` | JPEG quality (1-100) |
| `crop_video_player` | bool | `true` | Crop screenshots to video area |

## AI / LLM

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `provider` | string | `openai` | LLM provider: openai, google, anthropic |
| `model` | string | `gpt-4o` | Model name (provider-specific) |
| `temperature` | float | `0.3` | Creativity level (0.0 = deterministic) |
| `max_tokens` | int | `16000` | Maximum output tokens |
| `chunk_size` | int | `4000` | Max chars per transcript chunk |
| `chunk_overlap` | int | `200` | Overlap between chunks |
| `generate_quiz` | bool | `true` | Generate quiz questions |
| `generate_flashcards` | bool | `true` | Generate flashcards |
| `quiz_count` | int | `10` | Number of quiz questions |
| `flashcard_count` | int | `15` | Number of flashcards |

## Export

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `formats` | list | `[markdown, pdf]` | Output formats |
| `pdf_theme` | string | `professional` | PDF visual theme |
| `code_theme` | string | `monokai` | Syntax highlighting theme |
| `embed_screenshots` | bool | `true` | Include screenshots in notes |
| `table_of_contents` | bool | `true` | Generate table of contents |

## Performance

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `max_concurrent_ocr` | int | `4` | Max parallel OCR operations |
| `batch_ocr_size` | int | `10` | OCR batch size |
| `cache_models` | bool | `true` | Cache loaded ML models |
| `gpu_memory_fraction` | float | `0.8` | GPU memory allocation fraction |
