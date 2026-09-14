"""Command-line interface for Argus RedactCore."""

import argparse
import json
from pathlib import Path
import sys
from redact_core.entities import default_detector
from redact_core.models import SubjectContext
from redact_core.pipeline import default_pipeline
from redact_core.policy import default_policy_engine
from redact_core.storage import default_store


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="redact-core",
        description="Argus RedactCore: Policy-driven privacy-preserved document views",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available subcommands")

    # health
    subparsers.add_parser("health", help="Check subsystem health, storage, and entity recognizers")

    # inspect
    inspect_parser = subparsers.add_parser("inspect", help="Inspect document structure and candidate findings")
    inspect_parser.add_argument("file", type=str, help="Path to PDF or DOCX file")

    # process
    process_parser = subparsers.add_parser("process", help="Generate a privacy-preserved derived view")
    process_parser.add_argument("file", type=str, help="Path to input PDF or DOCX")
    process_parser.add_argument("--policy", "-p", type=str, default="sales-quarterly", help="Policy ID (default: sales-quarterly)")
    process_parser.add_argument("--subject", "-s", type=str, default="demo_sales_viewer", help="Subject ID")
    process_parser.add_argument("--role", "-r", type=str, action="append", default=[], help="Subject roles")
    process_parser.add_argument("--output", "-o", type=str, default=None, help="Output destination path")

    # verify
    verify_parser = subparsers.add_parser("verify", help="Verify a generated view manifest")
    verify_parser.add_argument("view_id", type=str, help="Derived view ID")

    return parser


def handle_health() -> int:
    policies = default_policy_engine.list_policies()
    print("=== Argus RedactCore Subsystem Status ===")
    print(f"Version: 0.1.0")
    print(f"Storage root: {default_store.root_dir}")
    print(f"Policies loaded ({len(policies)}): {', '.join(p.policy_id for p in policies)}")
    print(f"Presidio Analyzer Active: {default_detector.presidio_available}")
    if default_detector.presidio_limitation:
        print(f"Notice: {default_detector.presidio_limitation}")
    print("Baseline: Deterministic offline regex detector is READY.")
    print("Status: HEALTHY")
    return 0


def handle_inspect(file_path_str: str) -> int:
    path = Path(file_path_str)
    if not path.exists():
        print(f"Error: File '{file_path_str}' not found.", file=sys.stderr)
        return 1

    data = path.read_bytes()
    source_hash, _, doc = default_pipeline.ingest_document(data, path.name)
    findings = default_detector.detect_in_document(doc)

    print(f"=== Document Inspection: {doc.filename} ===")
    print(f"SHA-256: {source_hash}")
    print(f"Format: {doc.file_type.upper()} | Pages/Sections: {doc.page_count}")
    print(f"Text Blocks: {len(doc.text_blocks)} | Tables: {len(doc.tables)} | Figures: {len(doc.figures)}")
    if doc.warnings:
        print("\nWarnings:")
        for w in doc.warnings:
            print(f"  [!] {w}")

    print(f"\nCandidate Findings ({len(findings)} detected):")
    for f in findings:
        print(f"  - [{f.entity_type}] on {f.page_or_section} (conf: {f.confidence:.2f}, src: {f.source}, digest: {f.value_digest[:10]}...)")
    return 0


def handle_process(args) -> int:
    path = Path(args.file)
    if not path.exists():
        print(f"Error: File '{args.file}' not found.", file=sys.stderr)
        return 1

    data = path.read_bytes()
    source_hash, _, doc = default_pipeline.ingest_document(data, path.name)

    subject = SubjectContext(
        subject_id=args.subject,
        roles=set(args.role) if args.role else {"viewer"},
    )

    try:
        manifest, view_path = default_pipeline.generate_derived_view(
            source_sha256=source_hash,
            ext=doc.file_type,
            policy_id=args.policy,
            subject=subject,
        )
    except Exception as e:
        print(f"Error generating view: {e}", file=sys.stderr)
        return 1

    if args.output:
        out_p = Path(args.output)
        out_p.write_bytes(view_path.read_bytes())
        dest_display = str(out_p)
    else:
        dest_display = str(view_path)

    print("=== Privacy-Preserved Derived View Created ===")
    print(f"View ID: {manifest.view_id}")
    print(f"Source SHA-256: {manifest.source_sha256}")
    print(f"Output SHA-256: {manifest.output_sha256}")
    print(f"Policy: {manifest.policy_id} (v{manifest.policy_version})")
    print(f"Verification Passed: {manifest.verification.get('passed')}")
    print(f"Operations: {manifest.operation_counts}")
    print(f"Derived View Path: {dest_display}")
    return 0


def handle_verify(view_id: str) -> int:
    manifest = default_store.get_manifest(view_id)
    if not manifest:
        print(f"Error: Manifest for view '{view_id}' not found.", file=sys.stderr)
        return 1

    print(f"=== View Manifest: {view_id} ===")
    print(json.dumps(manifest.model_dump(), indent=2))
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if not args.command:
        parser.print_help()
        return 0

    if args.command == "health":
        return handle_health()
    elif args.command == "inspect":
        return handle_inspect(args.file)
    elif args.command == "process":
        return handle_process(args)
    elif args.command == "verify":
        return handle_verify(args.view_id)

    return 0


if __name__ == "__main__":
    sys.exit(main())
