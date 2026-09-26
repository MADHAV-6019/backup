"""
Pydantic output schemas for structured LLM note generation.

These models define the exact shape of the notes the LLM must produce.
LangChain's ``.with_structured_output()`` uses these schemas to enforce
validated, machine-parseable responses from the LLM.
"""

from __future__ import annotations

from pydantic import BaseModel, Field, ConfigDict


class _LenientModel(BaseModel):
    """Base model that ignores extra fields the LLM may produce."""
    model_config = ConfigDict(extra="ignore")


class KeyConcept(_LenientModel):
    """A key concept explained in the lecture."""
    name: str = Field(..., description="Concept name or title")
    explanation: str = Field(
        ...,
        description=(
            "Detailed explanation that teaches the concept from scratch. "
            "Include intuition, real-world analogies, and why it matters."
        ),
    )
    importance: str = Field(
        default="medium",
        description="Importance level: high, medium, or low",
    )


class Definition(_LenientModel):
    """A formal definition of a term or concept."""
    term: str = Field(..., description="The term being defined")
    definition: str = Field(..., description="Clear, precise definition")
    example: str = Field(default="", description="A concrete example illustrating the term")


class Algorithm(_LenientModel):
    """An algorithm discussed in the lecture."""
    name: str = Field(..., description="Algorithm name")
    description: str = Field(..., description="What the algorithm does and when to use it")
    steps: list[str] = Field(default_factory=list, description="Step-by-step breakdown")
    time_complexity: str = Field(default="", description="Time complexity (Big O)")
    space_complexity: str = Field(default="", description="Space complexity (Big O)")


class Formula(_LenientModel):
    """A mathematical formula or equation."""
    name: str = Field(..., description="Name or purpose of the formula")
    formula: str = Field(..., description="The formula in LaTeX or plain text notation")
    explanation: str = Field(
        ...,
        description="What each variable means and how the formula works",
    )
    when_to_use: str = Field(default="", description="When and why to apply this formula")


class CodeExample(_LenientModel):
    """A code example from or inspired by the lecture."""
    title: str = Field(..., description="Short descriptive title")
    language: str = Field(default="python", description="Programming language")
    code: str = Field(
        ...,
        description=(
            "Complete, runnable code. NEVER shorten or summarize. "
            "Include all imports, comments, and proper formatting."
        ),
    )
    explanation: str = Field(
        ...,
        description=(
            "Line-by-line explanation of what the code does, "
            "why each part is needed, and how it works."
        ),
    )
    output: str = Field(default="", description="Expected output or result")


class InterviewQuestion(_LenientModel):
    """An interview question related to the lecture topic."""
    question: str = Field(..., description="The interview question")
    answer: str = Field(
        ...,
        description=(
            "A comprehensive answer that would impress an interviewer. "
            "Include both conceptual explanation and practical examples."
        ),
    )
    difficulty: str = Field(default="medium", description="easy, medium, or hard")


class QuizQuestion(_LenientModel):
    """A quiz question for self-assessment."""
    question: str = Field(..., description="The quiz question")
    options: list[str] = Field(
        ...,
        description="4 answer options (prefix with A), B), C), D))",
        min_length=4,
        max_length=4,
    )
    correct_answer: str = Field(..., description="The correct option letter (A, B, C, or D)")
    explanation: str = Field(..., description="Why this answer is correct")


class Flashcard(_LenientModel):
    """A flashcard for spaced repetition study."""
    front: str = Field(..., description="Question or prompt on the front")
    back: str = Field(..., description="Answer or explanation on the back")


class LectureNotes(_LenientModel):
    """
    Complete structured notes for a single lecture.

    This is the main output schema that the LLM must fill entirely.
    Every section should be thorough and teach the concept, not just summarize.
    """

    lecture_title: str = Field(..., description="Title of the lecture")

    overview: str = Field(
        ...,
        description=(
            "Comprehensive overview of what this lecture covers. "
            "Set the context, explain prerequisites, and outline the learning objectives."
        ),
    )

    key_concepts: list[KeyConcept] = Field(
        default_factory=list,
        description="All key concepts covered, with detailed explanations",
    )

    definitions: list[Definition] = Field(
        default_factory=list,
        description="Important terms and their definitions with examples",
    )

    detailed_explanation: str = Field(
        ...,
        description=(
            "In-depth explanation of the main topic. Write as if teaching "
            "a student who is encountering this for the first time. "
            "Use analogies, diagrams described in text, and build up gradually."
        ),
    )

    code_examples: list[CodeExample] = Field(
        default_factory=list,
        description=(
            "All code shown in the lecture — reproduced EXACTLY, never summarized. "
        ),
    )

    summary: str = Field(
        ...,
        description="Concise summary of everything covered in the lecture",
    )
