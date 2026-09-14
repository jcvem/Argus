# Synthetic Test Fixtures for Argus RedactCore

These documents contain synthetic PII for testing deterministic redaction and policy enforcement:

- `sample_report.pdf`: Text-native PDF containing names, emails, phone numbers, employee IDs, salary, a table, and a figure.
- `sample_report.docx`: DOCX containing equivalent structured content and inline image.
- `scanned_sample.pdf`: Image-only PDF with no selectable text layer to verify fail-closed / requires-review behavior.
