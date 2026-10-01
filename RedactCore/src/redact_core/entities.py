"""Entity recognition engine.

Combines deterministic regex recognizers with optional Presidio analyzer fallback.
Guarantees local offline operation without external API calls or large model downloads.
"""

import logging
import re
from typing import Any
from redact_core.hashing import hash_sensitive_value
from redact_core.llm_entities import (
    EntityLLMConfigurationError,
    GeminiEntityInspector,
    is_entity_llm_strict,
)
from redact_core.models import EntityFinding, NormalizedDocument


logger = logging.getLogger(__name__)

# Deterministic regex patterns for standard sensitive entity types
REGEX_PATTERNS: dict[str, list[re.Pattern]] = {
    "EMAIL_ADDRESS": [
        re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
    ],
    "PHONE_NUMBER": [
        # US / International dashed/spaced formats
        re.compile(r"(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b"),
        # Taiwan mobile and local formats: 09xx-xxx-xxx, +886-x-xxxx-xxxx
        re.compile(r"\b09\d{2}[-\s]?\d{3}[-\s]?\d{3}\b"),
        re.compile(r"\b\+?886[-.\s]?\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}\b"),
    ],
    "EMPLOYEE_ID": [
        re.compile(r"\b(?:EMP|EID|STAFF)[-_]?[0-9]{3,8}\b", re.IGNORECASE),
        re.compile(r"\bEMP\d{4,6}\b", re.IGNORECASE),
    ],
    "SALARY": [
        re.compile(
            r"(?:\$|USD|NT\$|\bEUR\b|\bGBP\b)\s*[\d,]+(?:\.\d{2})?(?:\s*(?:/|per)\s*(?:yr|year|mo|month|annum|hr|hour))?\b",
            re.IGNORECASE,
        ),
        re.compile(r"\b\d{2,3}(?:,\d{3})+\s*(?:USD|TWD|EUR|GBP)\b"),
    ],
    "PROJECT_CODE": [
        re.compile(r"\b(?:PRJ|PROJECT|PROJ)[-_][A-Z0-9]{2,12}\b", re.IGNORECASE),
    ],
    "PERSON": [
        # Prefixed by title or role
        re.compile(
            r"(?:(?:Principal\s+Engineer|Security\s+Lead|Engineer|Lead|Manager|Author|Subject|Reviewer|Contact|Employee|Name):\s*)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)"
        ),
        re.compile(r"\b(?:Mr\.|Ms\.|Mrs\.|Dr\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b"),
    ],
    "ADDRESS": [
        re.compile(
            r"\b\d{1,5}\s+[A-Za-z0-9\s.,]+(?:\b(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Terrace|Way|Court|Ct|Plaza|Plz)\b)(?:,\s*[A-Za-z\s]+)?",
            re.IGNORECASE,
        ),
    ],
}


class EntityDetector:
    """Hybrid entity detector using deterministic regex recognizers, optional Presidio, and optional Gemini LLM."""

    def __init__(self, llm_inspector: GeminiEntityInspector | None = None):
        self.presidio_available = False
        self.presidio_limitation: str | None = None
        self.analyzer = None
        self._init_presidio_safely()
        self.llm_inspector = llm_inspector or GeminiEntityInspector()

    def _init_presidio_safely(self) -> None:
        """Attempts to initialize Presidio without triggering large background model downloads."""
        try:
            import spacy
            from presidio_analyzer import AnalyzerEngine

            # Check if any spacy models are installed locally
            installed = spacy.util.get_installed_models()
            if not installed:
                self.presidio_limitation = (
                    "No local spaCy NLP model installed (e.g. en_core_web_lg). "
                    "Operating with deterministic regex recognizers."
                )
                logger.info(self.presidio_limitation)
                return

            # If a model exists, try initializing
            self.analyzer = AnalyzerEngine()
            self.presidio_available = True
            logger.info("Presidio AnalyzerEngine initialized successfully with local model.")
        except Exception as e:
            self.presidio_available = False
            self.presidio_limitation = f"Presidio initialization bypassed: {e}"
            logger.info(self.presidio_limitation)

    def detect_in_text(
        self,
        text: str,
        page_or_section: str = "main",
        source_ref: str = "text",
        context_metadata: dict[str, Any] | None = None,
    ) -> list[EntityFinding]:
        """Detects candidate entities in a single text string."""
        findings: list[EntityFinding] = []
        seen_spans: set[tuple[str, int, int]] = set()

        # 1. Check known metadata context (e.g., author name)
        if context_metadata:
            author = context_metadata.get("author")
            if author and author.strip() and author.strip() in text:
                for match in re.finditer(re.escape(author.strip()), text):
                    val = match.group()
                    start, end = match.span()
                    if ("PERSON", start, end) not in seen_spans:
                        seen_spans.add(("PERSON", start, end))
                        findings.append(
                            EntityFinding(
                                finding_id=f"det_{len(findings)}_{hash_sensitive_value(val)[:8]}",
                                entity_type="PERSON",
                                value_digest=hash_sensitive_value(val),
                                page_or_section=page_or_section,
                                source_ref=source_ref,
                                start=start,
                                end=end,
                                confidence=0.95,
                                source="metadata_context",
                                requires_review=False,
                                raw_value=val,
                            )
                        )

        # 2. Run deterministic regex recognizers
        for entity_type, patterns in REGEX_PATTERNS.items():
            for pattern in patterns:
                for match in pattern.finditer(text):
                    # If pattern has a capturing group (e.g. for PERSON role prefix), use group(1)
                    if match.groups() and match.group(1):
                        val = match.group(1)
                        start = match.start(1)
                        end = match.end(1)
                    else:
                        val = match.group(0)
                        start = match.start(0)
                        end = match.end(0)

                    val_clean = val.strip()
                    if not val_clean or (entity_type, start, end) in seen_spans:
                        continue

                    seen_spans.add((entity_type, start, end))
                    findings.append(
                        EntityFinding(
                            finding_id=f"det_{len(findings)}_{hash_sensitive_value(val_clean)[:8]}",
                            entity_type=entity_type,
                            value_digest=hash_sensitive_value(val_clean),
                            page_or_section=page_or_section,
                            source_ref=source_ref,
                            start=start,
                            end=end,
                            confidence=0.99,
                            source="regex",
                            requires_review=False,
                            raw_value=val_clean,
                        )
                    )

        # 3. Optional Presidio fallback / enrichment if available
        if self.presidio_available and self.analyzer:
            try:
                results = self.analyzer.analyze(text=text, language="en")
                for r in results:
                    val = text[r.start : r.end].strip()
                    if not val or (r.entity_type, r.start, r.end) in seen_spans:
                        continue
                    seen_spans.add((r.entity_type, r.start, r.end))
                    findings.append(
                        EntityFinding(
                            finding_id=f"det_{len(findings)}_{hash_sensitive_value(val)[:8]}",
                            entity_type=r.entity_type,
                            value_digest=hash_sensitive_value(val),
                            page_or_section=page_or_section,
                            source_ref=source_ref,
                            start=r.start,
                            end=r.end,
                            confidence=r.score,
                            source="presidio",
                            requires_review=r.score < 0.75,
                            raw_value=val,
                        )
                    )
            except Exception as e:
                logger.warning(f"Presidio analyze error: {e}")

        # 4. Optional Gemini LLM inspection (strictly gated by feature flag and cloud consent)
        if self.llm_inspector.is_enabled():
            if not self.llm_inspector.is_cloud_consent_granted():
                msg = (
                    "Gemini LLM inspection enabled but cloud consent not granted "
                    "(REDACTCORE_ALLOW_CLOUD_LLM=false)."
                )
                self.llm_inspector.last_limitation = msg
                if is_entity_llm_strict():
                    raise EntityLLMConfigurationError(msg)
                logger.info(msg)
            elif not self.llm_inspector.is_configured():
                msg = (
                    f"Gemini LLM inspection enabled and permitted, but provider "
                    f"({self.llm_inspector.mode} mode) is not configured with credentials."
                )
                self.llm_inspector.last_limitation = msg
                if is_entity_llm_strict():
                    raise EntityLLMConfigurationError(msg)
                logger.info(msg)
            elif len(text.strip()) >= self.llm_inspector.min_chunk_chars:
                try:
                    llm_findings = self.llm_inspector.inspect_text(
                        text=text,
                        page_or_section=page_or_section,
                        source_ref=source_ref,
                    )
                    for lf in llm_findings:
                        # Exact span deduplication
                        if (lf.entity_type, lf.start, lf.end) in seen_spans:
                            continue

                        # Overlap check: deterministic regex / metadata takes priority
                        has_overlap = False
                        if lf.start is not None and lf.end is not None:
                            for ef in findings:
                                if ef.start is not None and ef.end is not None:
                                    if not (lf.end <= ef.start or lf.start >= ef.end):
                                        has_overlap = True
                                        break

                        if not has_overlap:
                            seen_spans.add((lf.entity_type, lf.start, lf.end))
                            findings.append(lf)
                except Exception as e:
                    self.llm_inspector.last_limitation = f"Gemini LLM inspection failed: {type(e).__name__}"
                    if is_entity_llm_strict():
                        raise
                    logger.warning(
                        "Gemini LLM inspection error bypassed (fallback to deterministic): %s",
                        type(e).__name__,
                    )

        return findings

    def get_health_summary(self) -> dict[str, Any]:
        """Observability health summary for entity recognizers."""
        return {
            "presidio": {
                "active": self.presidio_available,
                "limitation": self.presidio_limitation,
            },
            "baseline_detector": "regex_deterministic",
            "llm_inspector": self.llm_inspector.check_health(),
        }

    def detect_in_document(self, doc: NormalizedDocument) -> list[EntityFinding]:
        """Detects candidate entities across all blocks, tables, and metadata in a NormalizedDocument."""
        all_findings: list[EntityFinding] = []

        # Detect across text blocks
        for block in doc.text_blocks:
            findings = self.detect_in_text(
                text=block.text,
                page_or_section=block.page_or_section,
                source_ref=block.block_id,
                context_metadata=doc.metadata,
            )
            is_ocr_block = "ocr" in block.block_id.lower() or getattr(doc, "ocr_status", None) in ("complete", "partial")
            for f in findings:
                if is_ocr_block and f.source != "gemini_llm":
                    f.source = "ocr"
                # If block has spans with bboxes and f has character offsets, resolve exact span bbox
                if block.spans and f.start is not None and f.end is not None:
                    matching_spans = [
                        s for s in block.spans
                        if s.bbox and len(s.bbox) == 4 and not (s.end_char <= f.start or s.start_char >= f.end)
                    ]
                    if matching_spans:
                        x0 = min(s.bbox[0] for s in matching_spans)
                        y0 = min(s.bbox[1] for s in matching_spans)
                        x1 = max(s.bbox[2] for s in matching_spans)
                        y1 = max(s.bbox[3] for s in matching_spans)
                        f.bbox = [round(x0, 2), round(y0, 2), round(x1, 2), round(y1, 2)]
                # If still no bbox, assign block bbox
                if f.bbox is None and block.bbox:
                    f.bbox = block.bbox
            all_findings.extend(findings)

        # Detect across tables
        for table in doc.tables:
            for r_idx, row in enumerate(table.rows):
                for c_idx, cell_val in enumerate(row):
                    if not cell_val.strip():
                        continue
                    cell_findings = self.detect_in_text(
                        text=cell_val,
                        page_or_section=table.page_or_section,
                        source_ref=f"{table.table_id}_r{r_idx}_c{c_idx}",
                        context_metadata=doc.metadata,
                    )
                    all_findings.extend(cell_findings)

        # Deduplicate identical findings per page/section & entity type & value_digest
        deduped: list[EntityFinding] = []
        seen_keys: set[tuple[str, str, str]] = set()
        for f in all_findings:
            key = (f.page_or_section, f.entity_type, f.value_digest)
            if key not in seen_keys:
                seen_keys.add(key)
                deduped.append(f)

        return deduped


# Global detector instance
default_detector = EntityDetector()
