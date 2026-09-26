# Usage Guide

## Workflow Overview

```
1. notes-ai login          → Authenticate with Udemy
2. notes-ai scan <url>     → Discover course curriculum
3. notes-ai process <url>  → Generate notes for all lectures
4. notes-ai status         → Monitor progress
5. notes-ai resume         → Continue after interruption
```

## Commands

### `notes-ai login`

Opens a Chromium browser window. Log into Udemy manually. Your session is saved to `browser_data/` so you won't need to log in again.

```bash
notes-ai login
```

### `notes-ai scan <url>`

Scans the course page and displays all sections, lectures, durations, and content types.

```bash
notes-ai scan "https://www.udemy.com/course/machine-learning-course/"
```

### `notes-ai process <url>`

The main command. Processes lectures through the full pipeline.

```bash
# Process all lectures
notes-ai process "https://www.udemy.com/course/machine-learning-course/"

# Process a single lecture
notes-ai process "https://www.udemy.com/course/..." --lecture 5

# Start from lecture 10
notes-ai process "https://www.udemy.com/course/..." --start-from 10

# Skip lectures already completed on Udemy
notes-ai process "https://www.udemy.com/course/..." --skip-completed
```

### `notes-ai resume`

Automatically detects the last incomplete course and resumes from the last checkpoint.

```bash
notes-ai resume

# Or specify a course
notes-ai resume "https://www.udemy.com/course/..."
```

### `notes-ai export <url>`

Re-export notes in a different format (useful after changing PDF theme).

```bash
notes-ai export "https://www.udemy.com/course/..." --format pdf
notes-ai export "https://www.udemy.com/course/..." --format both
```

### `notes-ai config`

Display current configuration settings.

```bash
notes-ai config --show
```

### `notes-ai clean`

Remove temporary and cached files.

```bash
notes-ai clean --cache      # Remove model cache
notes-ai clean --browser    # Remove browser session
notes-ai clean --all        # Remove everything
```

### `notes-ai status`

Show processing progress for all courses.

```bash
notes-ai status
```

## Tips

- **Start with a small test**: Process a single lecture first (`--lecture 1`) to verify everything works
- **Use `base` Whisper model first**: Upgrade to `medium` or `large-v3` once you confirm it's working
- **Check output quality**: Review the first set of notes and adjust `config.yaml` if needed
- **Resume is automatic**: If the process crashes, just run `notes-ai resume`
