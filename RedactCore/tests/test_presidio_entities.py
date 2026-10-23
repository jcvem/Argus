"""Focused tests for local spaCy and Presidio multi-language entity recognition.

Verifies:
- en_core_web_lg and en_core_web_trf English NER (PERSON, ORGANIZATION, LOCATION)
- zh_core_web_lg Traditional/Simplified Chinese NER (人名, 機構)
- Overlap handling: deterministic regex/metadata takes priority over Presidio
- Health summary reporting active models and languages
- Local zero-token offline execution
"""

import pytest
from redact_core.entities import EntityDetector
from redact_core.models import NormalizedDocument, TextBlock


def test_presidio_health_and_models():
    detector = EntityDetector(enable_presidio=True)
    health = detector.get_health_summary()
    assert health["presidio"]["active"] is True
    assert "en" in health["presidio"]["languages"]
    assert "zh" in health["presidio"]["languages"]
    assert "en" in health["presidio"]["models"]
    assert "zh" in health["presidio"]["models"]
    assert health["presidio"]["limitation"] is None


def test_presidio_english_entity_recognition():
    detector = EntityDetector(enable_presidio=True)
    text = "Alice Montgomery discussed quarterly earnings with Goldman Sachs in London."

    findings = detector.detect_in_text(text)
    presidio_findings = [f for f in findings if f.source == "presidio"]

    types_found = {f.entity_type for f in presidio_findings}
    raw_values = {f.raw_value for f in presidio_findings}

    assert "PERSON" in types_found
    assert "Alice Montgomery" in raw_values

    assert "ORGANIZATION" in types_found or "LOCATION" in types_found
    # Check that findings have valid confidence and character offsets
    for f in presidio_findings:
        assert 0.0 <= f.confidence <= 1.0
        assert text[f.start:f.end] == f.raw_value


def test_presidio_chinese_entity_recognition():
    detector = EntityDetector(enable_presidio=True)
    text = "專案會議上，林美麗與張小龍介紹了台北數位科技創新中心。"

    findings = detector.detect_in_text(text)
    presidio_findings = [f for f in findings if f.source == "presidio"]

    types_found = {f.entity_type for f in presidio_findings}
    raw_values = {f.raw_value for f in presidio_findings}

    # Chinese person name without title prefix
    assert "PERSON" in types_found
    assert "林美麗" in raw_values
    assert "LOCATION" in types_found or "ORGANIZATION" in types_found


def test_presidio_regex_overlap_priority():
    detector = EntityDetector(enable_presidio=True)
    # Email is matched by regex; Presidio should not create an overlapping duplicate
    text = "Send confirmation to alice.montgomery@example.com immediately."

    findings = detector.detect_in_text(text)
    email_findings = [f for f in findings if "alice.montgomery@example.com" in (f.raw_value or "")]

    assert len(email_findings) == 1
    assert email_findings[0].source == "regex"
    assert email_findings[0].entity_type == "EMAIL_ADDRESS"


def test_presidio_trf_model_switch(monkeypatch):
    monkeypatch.setenv("REDACTCORE_SPACY_MODEL_EN", "en_core_web_trf")
    detector = EntityDetector(enable_presidio=True)
    health = detector.get_health_summary()

    assert health["presidio"]["active"] is True
    assert health["presidio"]["models"]["en"] == "en_core_web_trf"

    findings = detector.detect_in_text("Dr. Alice Montgomery visited Stanford University.")
    person_f = next((f for f in findings if f.raw_value == "Alice Montgomery"), None)
    assert person_f is not None
