"""The system-under-test: named, deterministic extractive-QA strategies.

These are the "variants" an EvalOps user would compare, made concrete and
credential-free so the public benchmark reproduces anywhere. Each target maps a
``Case`` to a predicted answer string. They differ in real, explainable ways, so
the harness surfaces a genuine quality delta (and genuine per-case regressions),
not a manufactured one.

A live-LLM target would implement the same ``Target`` signature; it is an
optional extension, never required by the public benchmark.
"""
from __future__ import annotations

import re
from collections.abc import Callable

from .cases import Case
from .normalize import normalize_answer

Target = Callable[[Case], str]

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")
_YEAR = re.compile(r"\b(?:1[0-9]{3}|2[0-9]{3})\b")
_NUMBER = re.compile(r"\b\d[\d,]*(?:\.\d+)?\b")
_PROPER_NOUN = re.compile(r"\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\b")

_STOPWORDS = frozenset(
    """
    a an the of to in on at for and or but is are was were be been being am
    this that these those with as by from into over under after before it its
    their his her him she he they them we you your our
    what when where who whom which why how whose does did do done has have had
    """.split()
)


def split_sentences(text: str) -> list[str]:
    """Split a passage into trimmed, non-empty sentences."""
    return [part.strip() for part in _SENTENCE_SPLIT.split(text.strip()) if part.strip()]


def _content_tokens(text: str) -> set[str]:
    return {tok for tok in normalize_answer(text).split() if tok not in _STOPWORDS}


def _best_sentence(case: Case) -> str:
    """The sentence whose content words most overlap the question.

    Ties break toward the shorter sentence (more answer-dense). This is the
    shared retrieval step both the baseline and candidate build on.
    """
    sentences = split_sentences(case.context)
    if not sentences:
        return case.context.strip()
    question_tokens = _content_tokens(case.question)
    if not question_tokens:
        return sentences[0]

    def rank(sentence: str) -> tuple[int, int]:
        overlap = len(question_tokens & _content_tokens(sentence))
        return (overlap, -len(_content_tokens(sentence)))

    return max(sentences, key=rank)


def _question_word(question: str) -> str:
    tokens = normalize_answer(question).split()
    return tokens[0] if tokens else ""


def _first_novel_proper_noun(sentence: str, question: str) -> str | None:
    """First proper-noun phrase that the question does not already name.

    Skipping the subject the question is about (and sentence-initial articles
    like "The") is what makes the candidate competent on most factoids. Picking
    the *first* remaining entity is also what makes it fail when a distractor
    entity precedes the answer.
    """
    question_tokens = _content_tokens(question)
    for match in _PROPER_NOUN.finditer(sentence):
        phrase_tokens = _content_tokens(match.group(0))
        if not phrase_tokens or phrase_tokens & question_tokens:
            continue
        return match.group(0)
    return None


def first_sentence(case: Case) -> str:
    """Floor strategy: always return the opening sentence."""
    sentences = split_sentences(case.context)
    return sentences[0] if sentences else case.context.strip()


def overlap_sentence(case: Case) -> str:
    """Baseline: return the whole best-overlap sentence.

    Safe but blunt — it scores partial F1 on most cases and rarely an exact
    match, because it returns far more than the answer span.
    """
    return _best_sentence(case)


def span_extract(case: Case) -> str:
    """Candidate: locate the best sentence, then narrow to an answer span.

    Wins big on factoid questions (who/when/where/how-many) by returning the
    span instead of the sentence. Can mis-fire on adversarial phrasing (grabs
    the first proper noun or number when the answer is a later one), which is
    exactly the silent regression the harness exists to catch.
    """
    sentence = _best_sentence(case)
    qword = _question_word(case.question)
    lowered = case.question.lower()

    if qword == "when" or "what year" in lowered or "which year" in lowered:
        match = _YEAR.search(sentence) or _NUMBER.search(sentence)
        if match:
            return match.group(0)
    if qword == "how" and any(
        phrase in lowered for phrase in ("how many", "how much", "how long", "how old")
    ):
        match = _NUMBER.search(sentence)
        if match:
            return match.group(0)
    if qword in {"who", "whom", "where"}:
        span = _first_novel_proper_noun(sentence, case.question)
        if span:
            return span

    # No confident span: fall back to the best sentence (never worse than baseline here).
    return sentence


REGISTRY: dict[str, Target] = {
    "first_sentence": first_sentence,
    "overlap_sentence": overlap_sentence,
    "span_extract": span_extract,
}


def get_target(name: str) -> Target:
    try:
        return REGISTRY[name]
    except KeyError:
        raise ValueError(
            f"unknown target {name!r}; known targets: {sorted(REGISTRY)}"
        ) from None
