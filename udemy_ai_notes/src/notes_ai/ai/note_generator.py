"""
LLM-powered note generator — the brain of the pipeline.

Uses LangChain with structured output to generate comprehensive,
validated study notes from transcripts, OCR text, and code blocks.
Supports OpenAI, Google Gemini, and Anthropic.
"""

from __future__ import annotations

from typing import Optional

from notes_ai.ai.prompts import (
    SYSTEM_PROMPT,
    build_note_prompt,
    detect_ml_topic,
)
from notes_ai.ai.schemas import LectureNotes
from notes_ai.core.config import AppConfig
from notes_ai.core.models import CodeBlock, LLMProvider, Transcript, SlideFrame
from notes_ai.utils.helpers import chunk_text
from notes_ai.utils.logging import get_logger

logger = get_logger("ai.note_generator")


class NoteGenerator:
    """
    Generates structured study notes using an LLM.

    Supports multiple providers (OpenAI, Google Gemini, Anthropic)
    and uses LangChain's structured output for validated responses.
    """

    def __init__(self, config: AppConfig) -> None:
        self.config = config
        self.ai_cfg = config.ai
        self._llm = None
        self._current_api_key = None

    def _get_api_key_from_file(self) -> Optional[str]:
        import os
        from pathlib import Path
        path = Path("apikey.txt")
        if not path.exists():
            return None
        lines = [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
        return lines[0] if lines else None

    def _remove_current_api_key(self) -> None:
        from pathlib import Path
        path = Path("apikey.txt")
        if not path.exists():
            return
        lines = [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
        if lines:
            lines = lines[1:]
            path.write_text("\n".join(lines), encoding="utf-8")

    def _init_llm(self, force_reload=False) -> None:
        """Initialize the LLM based on the configured provider."""
        if self._llm is not None and not force_reload:
            return

        import os
        file_key = self._get_api_key_from_file()
        provider = self.ai_cfg.provider
        self._current_api_key = file_key  # Track which key we're using

        if file_key:
            if provider == LLMProvider.GROQ:
                os.environ["GROQ_API_KEY"] = file_key
            elif provider == LLMProvider.OPENAI:
                os.environ["OPENAI_API_KEY"] = file_key
            elif provider == LLMProvider.GOOGLE:
                os.environ["GOOGLE_API_KEY"] = file_key
            elif provider == LLMProvider.ANTHROPIC:
                os.environ["ANTHROPIC_API_KEY"] = file_key
            logger.info("Using API key from apikey.txt: %s...%s", file_key[:8], file_key[-4:])

        if provider == LLMProvider.OPENAI:
            from langchain_openai import ChatOpenAI
            self._llm = ChatOpenAI(
                model=self.ai_cfg.model,
                temperature=self.ai_cfg.temperature,
                max_tokens=self.ai_cfg.max_tokens,
            )
            logger.info("Initialized OpenAI LLM: %s", self.ai_cfg.model)

        elif provider == LLMProvider.GOOGLE:
            from langchain_google_genai import ChatGoogleGenerativeAI
            self._llm = ChatGoogleGenerativeAI(
                model=self.ai_cfg.model,
                temperature=self.ai_cfg.temperature,
                max_output_tokens=self.ai_cfg.max_tokens,
            )
            logger.info("Initialized Google Gemini LLM: %s", self.ai_cfg.model)

        elif provider == LLMProvider.GROQ:
            from langchain_groq import ChatGroq
            groq_key = self._current_api_key or os.environ.get("GROQ_API_KEY")
            self._llm = ChatGroq(
                model_name=self.ai_cfg.model,
                temperature=self.ai_cfg.temperature,
                max_tokens=self.ai_cfg.max_tokens,
                groq_api_key=groq_key,
            )
            logger.info("Initialized Groq LLM: %s", self.ai_cfg.model)

        elif provider == LLMProvider.ANTHROPIC:
            from langchain_anthropic import ChatAnthropic
            self._llm = ChatAnthropic(
                model=self.ai_cfg.model,
                temperature=self.ai_cfg.temperature,
                max_tokens=self.ai_cfg.max_tokens,
            )
            logger.info("Initialized Anthropic LLM: %s", self.ai_cfg.model)

        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")

    def generate_notes(
        self,
        lecture_title: str,
        transcript: Optional[Transcript],
        code_blocks: list[CodeBlock],
        slides: list[SlideFrame],
    ) -> LectureNotes:
        """
        Generate comprehensive study notes for a lecture.

        Assembles all inputs (transcript, code, OCR), sends to the LLM
        with structured output constraints, and returns validated notes.

        Args:
            lecture_title: Title of the lecture.
            transcript: Transcription of the lecture audio.
            code_blocks: Code snippets detected on screen.
            slides: Slide frames with OCR results.

        Returns:
            Validated ``LectureNotes`` with all sections populated.
        """
        self._init_llm()

        # Assemble input data and aggressively truncate to avoid 413 Token Limits
        transcript_text = transcript.full_text if transcript else ""
        code_text = self._format_code_blocks(code_blocks)
        ocr_text = self._format_ocr_text(slides)
        
        # Hard limits for Groq free tier (6000 tokens ~ 24,000 chars total)
        # We must leave headroom for the generated output!
        if self.ai_cfg.provider == LLMProvider.GROQ:
            # Force chunk size down to guarantee safety
            self.ai_cfg.chunk_size = min(self.ai_cfg.chunk_size, 1000)
            
            if len(code_text) > 2000:
                logger.warning("Truncating code text from %d to 2000 chars", len(code_text))
                code_text = code_text[:2000] + "\n\n...[CODE TRUNCATED]..."
            if len(ocr_text) > 4000:
                logger.warning("Truncating OCR text from %d to 4000 chars", len(ocr_text))
                ocr_text = ocr_text[:4000] + "\n\n...[OCR TRUNCATED]..."

        # Detect if this is an ML topic
        is_ml = detect_ml_topic(lecture_title, transcript_text)
        if is_ml:
            logger.info("ML topic detected — adding specialized enhancements")

        # Handle long transcripts with chunking
        if len(transcript_text) > self.ai_cfg.chunk_size * 3:
            return self._generate_chunked(
                lecture_title, transcript_text, code_text, ocr_text, is_ml
            )

        # Build prompt
        prompt = build_note_prompt(
            lecture_title=lecture_title,
            transcript=transcript_text,
            code_blocks=code_text,
            ocr_text=ocr_text,
            is_ml_topic=is_ml,
        )

        # Generate with structured output
        notes = self._invoke_llm(prompt)

        logger.info(
            "Generated notes: %d concepts, %d code examples, %d quiz questions",
            len(notes.key_concepts),
            len(notes.code_examples),
            len(getattr(notes, "quiz", [])),
        )

        return notes

    def _invoke_llm(self, prompt: str, retries: int = 15) -> LectureNotes:
        """
        Invoke the LLM with structured output and retry on failure.

        Uses JSON mode instead of tool calling for better compatibility
        with smaller models like llama-3.1-8b-instant on Groq.
        """
        from langchain_core.messages import HumanMessage, SystemMessage
        import json

        # Build the JSON schema hint so the LLM knows the exact structure
        schema_hint = """
You MUST respond with ONLY a valid JSON object matching this exact schema (no markdown, no extra text):
{
  "lecture_title": "string",
  "overview": "string",
  "key_concepts": [{"name": "string", "explanation": "string", "importance": "high|medium|low"}],
  "definitions": [{"term": "string", "definition": "string", "example": "string"}],
  "detailed_explanation": "string",
  "code_examples": [{"title": "string", "language": "string", "code": "string", "explanation": "string", "output": "string"}],
  "summary": "string"
}
"""

        messages = [
            SystemMessage(content=SYSTEM_PROMPT + "\n\n" + schema_hint),
            HumanMessage(content=prompt),
        ]

        import time
        for attempt in range(retries):
            try:
                # Try JSON mode first (works much better with Groq/Llama)
                if self.ai_cfg.provider == LLMProvider.GROQ:
                    response = self._llm.invoke(
                        messages,
                        response_format={"type": "json_object"},
                    )
                    # Parse the raw JSON response into LectureNotes
                    raw_text = response.content
                    data = json.loads(raw_text)
                    result = LectureNotes(**data)
                else:
                    structured_llm = self._llm.with_structured_output(LectureNotes)
                    result = structured_llm.invoke(messages)

                if result is not None:
                    return result
            except json.JSONDecodeError as e:
                logger.warning(
                    "LLM attempt %d/%d — invalid JSON: %s",
                    attempt + 1, retries, e,
                )
                if attempt == retries - 1:
                    raise
                time.sleep(5)
            except Exception as e:
                err_str = str(e).lower()
                logger.warning(
                    "LLM attempt %d/%d failed: %s",
                    attempt + 1, retries, e,
                )
                if attempt == retries - 1:
                    raise
                
                # 413 = prompt+max_tokens too large for the TPM window → just wait
                if "413" in err_str or "too large" in err_str:
                    logger.error("413 Request too large (Prompt + Max Tokens > Limit). Cannot proceed with this chunk. Skipping...")
                    # We can't wait this out, the prompt itself is too big for the model's limit.
                    # Throw an error to skip this chunk/lecture rather than infinite loop.
                    raise RuntimeError("Prompt too large for LLM context window (413)")
                # 429 = per-minute rate limit exhausted → rotate to the next API key
                elif "429" in err_str or "rate_limit_exceeded" in err_str:
                    logger.warning("429 Rate limit hit. Rotating to next API key...")
                    self._remove_current_api_key()
                    next_key = self._get_api_key_from_file()
                    if next_key:
                        logger.info("Switched to next API key. Re-initializing LLM...")
                        self._init_llm(force_reload=True)
                        continue
                    else:
                        logger.warning("No more keys in apikey.txt. Waiting 60s for reset...")
                        time.sleep(60)
                # quota / insufficient_quota → key is fully dead, rotate
                elif "quota" in err_str or "insufficient" in err_str:
                    logger.warning("API key quota exhausted. Rotating to next key...")
                    self._remove_current_api_key()
                    next_key = self._get_api_key_from_file()
                    if next_key:
                        logger.info("Switched to next API key. Re-initializing LLM...")
                        self._init_llm(force_reload=True)
                        continue
                    else:
                        logger.warning("No more keys in apikey.txt. Waiting 60s...")
                        time.sleep(60)
                else:
                    time.sleep(5)

        raise RuntimeError("All LLM attempts exhausted")

    def _generate_chunked(
        self,
        lecture_title: str,
        transcript_text: str,
        code_text: str,
        ocr_text: str,
        is_ml: bool,
    ) -> LectureNotes:
        """
        Generate notes for long lectures by processing in chunks.

        Splits the transcript into chunks, generates partial notes
        for each, then merges them into final comprehensive notes.

        Args:
            lecture_title: Lecture title.
            transcript_text: Full transcript text.
            code_text: Formatted code blocks.
            ocr_text: OCR text from slides.
            is_ml: Whether this is an ML topic.

        Returns:
            Merged ``LectureNotes``.
        """
        logger.info("Long transcript — using chunked generation")

        chunks = chunk_text(
            transcript_text,
            chunk_size=self.ai_cfg.chunk_size,
            overlap=self.ai_cfg.chunk_overlap,
        )

        logger.info("Split into %d chunks", len(chunks))

        # Generate notes for each chunk
        partial_notes: list[LectureNotes] = []
        for i, chunk in enumerate(chunks):
            logger.info("Processing chunk %d/%d", i + 1, len(chunks))
            prompt = build_note_prompt(
                lecture_title=f"{lecture_title} (Part {i + 1}/{len(chunks)})",
                transcript=chunk,
                code_blocks=code_text if i == 0 else "(see Part 1)",
                ocr_text=ocr_text if i == 0 else "(see Part 1)",
                is_ml_topic=is_ml,
            )
            notes = self._invoke_llm(prompt)
            partial_notes.append(notes)

        # Merge all partial notes
        return self._merge_notes(lecture_title, partial_notes)

    def _merge_notes(
        self, lecture_title: str, parts: list[LectureNotes]
    ) -> LectureNotes:
        """
        Merge multiple partial LectureNotes into one.

        Concatenates lists and combines text fields.

        Args:
            lecture_title: Original lecture title.
            parts: List of partial notes to merge.

        Returns:
            Single merged ``LectureNotes``.
        """
        if len(parts) == 1:
            return parts[0]

        merged = LectureNotes(
            lecture_title=lecture_title,
            overview=parts[0].overview,
            key_concepts=[c for p in parts for c in p.key_concepts],
            definitions=[d for p in parts for d in p.definitions],
            detailed_explanation="\n\n".join(p.detailed_explanation for p in parts),
            code_examples=[c for p in parts for c in p.code_examples],
            summary=parts[-1].summary,
        )

        # Deduplicate concepts and definitions by name
        seen_concepts = set()
        unique_concepts = []
        for c in merged.key_concepts:
            if c.name.lower() not in seen_concepts:
                seen_concepts.add(c.name.lower())
                unique_concepts.append(c)
        merged.key_concepts = unique_concepts

        seen_defs = set()
        unique_defs = []
        for d in merged.definitions:
            if d.term.lower() not in seen_defs:
                seen_defs.add(d.term.lower())
                unique_defs.append(d)
        merged.definitions = unique_defs

        return merged

    # ------------------------------------------------------------------
    # Formatters
    # ------------------------------------------------------------------

    @staticmethod
    def _format_code_blocks(blocks: list[CodeBlock]) -> str:
        """Format code blocks for inclusion in the prompt."""
        if not blocks:
            return ""

        parts: list[str] = []
        for i, block in enumerate(blocks, 1):
            parts.append(
                f"### Code Block {i} ({block.language})\n"
                f"```{block.language}\n"
                f"{block.code}\n"
                f"```\n"
            )
        return "\n".join(parts)

    @staticmethod
    def _format_ocr_text(slides: list[SlideFrame]) -> str:
        """Format OCR text from slides for inclusion in the prompt."""
        if not slides:
            return ""

        parts: list[str] = []
        for slide in slides:
            if not slide.ocr_results:
                continue

            text_parts: list[str] = []
            for result in slide.ocr_results:
                prefix = ""
                if result.region_type == "heading":
                    prefix = "## "
                elif result.region_type == "code":
                    prefix = "`"
                text_parts.append(f"{prefix}{result.text}")

            if text_parts:
                parts.append(
                    f"[Slide at {slide.timestamp_seconds:.0f}s]\n"
                    + "\n".join(text_parts)
                )

        return "\n\n".join(parts)
