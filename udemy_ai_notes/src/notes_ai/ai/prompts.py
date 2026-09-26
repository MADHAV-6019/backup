"""
Prompt templates for the LLM note generator.

Contains the system prompt, main note generation prompt, and
specialized prompts for ML-focused content.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# System prompt — defines the AI persona and rules
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are a world-class AI professor, Machine Learning engineer, Data Scientist, and technical writer with decades of teaching experience.

Your mission is to transform lecture transcripts and visual content into COMPREHENSIVE, UNIVERSITY-LEVEL study notes that teach concepts deeply — not merely summarize them.

## Your Teaching Philosophy
- Explain every concept as if the student is encountering it for the FIRST TIME
- Build intuition before diving into formulas
- Use real-world analogies to make abstract ideas concrete
- Connect new concepts to things the student already knows
- Show HOW and WHY, not just WHAT

## Absolute Rules — NEVER VIOLATE
1. STRICTLY base your notes ONLY on the provided Transcript, OCR text, and Code. DO NOT generate outside concepts or random notes that are not taught in this specific lecture.
2. NEVER shorten, summarize, or paraphrase code — reproduce it EXACTLY as shown.
3. NEVER omit important concepts mentioned in the transcript.
4. ONLY explain mathematics or concepts that are actually discussed in the lecture.
5. ALWAYS explain API methods, parameters, and syntax line-by-line IF they appear in the lecture.
6. DO NOT hallucinate "additional examples" unless they directly clarify a confusing point strictly from the lecture.
7. Focus entirely on summarizing and structuring exactly what the instructor teaches.

## For Code
- Reproduce ALL code exactly — indentation, comments, formatting
- Add inline comments explaining each line
- Explain the logic flow
- Show expected output
- Discuss edge cases
- Mention common bugs and debugging tips

## For Mathematics
- State the formula clearly
- Define EVERY variable
- Show derivation steps if relevant
- Provide numerical examples
- Explain geometric/visual intuition
- State assumptions and limitations
"""

# ---------------------------------------------------------------------------
# Main note generation prompt
# ---------------------------------------------------------------------------

NOTE_GENERATION_PROMPT = """Generate comprehensive study notes for the following lecture.

## Lecture Title
{lecture_title}

## Transcript
{transcript}

## Code Detected on Screen (preserve EXACTLY — do NOT modify)
{code_blocks}

## Text Extracted from Slides (OCR)
{ocr_text}

## Instructions
Create thorough study notes following the structured schema. Every section must be filled with high-quality content:

1. **Overview**: Set context, explain prerequisites, outline learning objectives
2. **Key Concepts**: Deep explanations with intuition and analogies
3. **Definitions**: Precise definitions with concrete examples
4. **Detailed Explanation**: Teach the topic from scratch — assume no prior knowledge
5. **Code Examples**: Document exactly what is typed in the video
6. **Summary**: Comprehensive recap

Remember: TEACH, don't just summarize. The goal is for a student to fully understand the topic from these notes alone.
"""

# ---------------------------------------------------------------------------
# ML-specific enhancement prompt
# ---------------------------------------------------------------------------

ML_ENHANCEMENT_PROMPT = """This lecture covers Machine Learning topics. Enhance the notes with:

## Additional ML-Specific Requirements
1. **Mathematics**: Include all relevant math — loss functions, gradients, optimization
2. **Assumptions**: State model assumptions clearly
3. **Advantages & Disadvantages**: Compare with alternative approaches
4. **Complexity**: Time and space complexity of training and prediction
5. **Scikit-learn**: Show the scikit-learn API usage with fit/predict/transform
6. **NumPy**: Show relevant NumPy operations
7. **Pandas**: Show data preprocessing with Pandas
8. **Visualization**: Describe matplotlib/seaborn visualization examples
9. **Hyperparameters**: List all important hyperparameters with:
   - What they control
   - Default values
   - How to tune them
   - Impact on bias/variance
10. **Common Bugs**: Typical implementation errors
11. **Debugging Tips**: How to diagnose model issues
12. **Industry Applications**: Which companies use this and for what
13. **Interview Deep-Dive**: Include at least 3 ML-specific interview questions covering:
    - Theory (e.g., "Explain the bias-variance tradeoff")
    - Implementation (e.g., "How would you implement this from scratch?")
    - System Design (e.g., "How would you deploy this model at scale?")
"""

# ---------------------------------------------------------------------------
# Quiz generation prompt (standalone)
# ---------------------------------------------------------------------------

QUIZ_PROMPT = """Based on the following lecture content, generate exactly 10 multiple-choice quiz questions.

## Lecture Title: {lecture_title}

## Content Summary:
{content_summary}

## Requirements:
- Mix difficulty levels: 3 easy, 4 medium, 3 hard
- Cover different aspects of the lecture
- Include at least 2 code-related questions if code was presented
- Each question must have exactly 4 options (A, B, C, D)
- Explanations must teach WHY the answer is correct
- Distractors should be plausible but clearly wrong
"""

# ---------------------------------------------------------------------------
# Flashcard generation prompt (standalone)
# ---------------------------------------------------------------------------

FLASHCARD_PROMPT = """Generate exactly 15 flashcards for spaced repetition study based on this lecture.

## Lecture Title: {lecture_title}

## Content Summary:
{content_summary}

## Requirements:
- Front: Clear, specific question or prompt
- Back: Comprehensive but concise answer
- Mix of concept definitions, code snippets, formulas, and comparisons
- Include at least 2 flashcards for code syntax
- Include at least 2 flashcards for common mistakes/pitfalls
- Answers should be self-contained (understandable without the lecture)
"""


def build_note_prompt(
    lecture_title: str,
    transcript: str,
    code_blocks: str,
    ocr_text: str,
    is_ml_topic: bool = False,
) -> str:
    """
    Build the complete note generation prompt.

    Args:
        lecture_title: Title of the lecture.
        transcript: Full transcript text.
        code_blocks: Formatted code blocks detected on screen.
        ocr_text: Text extracted from slides via OCR.
        is_ml_topic: Whether to include ML-specific enhancements.

    Returns:
        Complete formatted prompt string.
    """
    prompt = NOTE_GENERATION_PROMPT.format(
        lecture_title=lecture_title,
        transcript=transcript or "(No transcript available)",
        code_blocks=code_blocks or "(No code detected)",
        ocr_text=ocr_text or "(No slide text detected)",
    )

    if is_ml_topic:
        prompt += "\n\n" + ML_ENHANCEMENT_PROMPT

    return prompt


def detect_ml_topic(title: str, transcript: str) -> bool:
    """
    Detect whether a lecture is about Machine Learning.

    Args:
        title: Lecture title.
        transcript: Lecture transcript.

    Returns:
        True if the lecture appears to be ML-related.
    """
    ml_keywords = [
        "machine learning", "deep learning", "neural network",
        "regression", "classification", "clustering",
        "decision tree", "random forest", "gradient boosting",
        "svm", "support vector", "naive bayes",
        "linear regression", "logistic regression",
        "overfitting", "underfitting", "bias variance",
        "cross validation", "hyperparameter",
        "feature engineering", "feature selection",
        "dimensionality reduction", "pca",
        "convolutional", "recurrent", "lstm", "transformer",
        "attention mechanism", "backpropagation",
        "loss function", "gradient descent", "optimizer",
        "sklearn", "scikit-learn", "tensorflow", "pytorch",
        "model training", "model evaluation",
        "precision", "recall", "f1 score", "auc", "roc",
        "confusion matrix", "accuracy",
        "ensemble", "bagging", "boosting",
        "k-means", "k-nearest", "knn",
        "natural language processing", "nlp",
        "computer vision", "object detection",
        "reinforcement learning",
    ]

    combined = (title + " " + transcript).lower()
    matches = sum(1 for kw in ml_keywords if kw in combined)

    # Consider it ML if at least 3 ML keywords are found
    return matches >= 3
