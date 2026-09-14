"""Synthetic fixture generator for Argus RedactCore.

Generates:
1. fixtures/sample_report.pdf (Text-native PDF with sensitive PII, tables, and a figure)
2. fixtures/sample_report.docx (DOCX with sensitive PII, tables, and an inline figure)
3. fixtures/scanned_sample.pdf (Image-only scanned document to test fail-closed behavior)
"""

from io import BytesIO
from pathlib import Path
import docx
from docx.shared import Inches, Pt, RGBColor
from PIL import Image, ImageDraw, ImageFont
import pymupdf


FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"

# Known synthetic test PII constants for testing & leak verification
FIXTURE_PII = {
    "person_1": "Alice Montgomery",
    "email_1": "alice.montgomery@argus-corp.internal",
    "phone_1": "+1-555-234-5678",
    "emp_id_1": "EMP-84920",
    "salary_1": "$185,000 / year",
    "person_2": "Bob Chen",
    "email_2": "bob.chen@argus-corp.internal",
    "phone_2": "0912-345-678",
    "emp_id_2": "EMP-39201",
    "salary_2": "$142,000 / year",
    "project_code": "PRJ-TITAN-09",
    "address": "742 Evergreen Terrace, Springfield",
}


def create_sample_chart_image() -> bytes:
    """Creates a sample organizational chart image."""
    img = Image.new("RGB", (600, 250), color=(245, 247, 250))
    draw = ImageDraw.Draw(img)
    # Draw a header box
    draw.rectangle([20, 20, 580, 60], fill=(41, 128, 185), outline=(31, 97, 141), width=2)
    draw.text((30, 32), "Confidential Architecture Diagram", fill=(255, 255, 255))
    # Draw some sub-boxes
    draw.rectangle([50, 100, 250, 180], fill=(230, 240, 250), outline=(52, 152, 219), width=2)
    draw.text((60, 115), "Security Core Engine", fill=(30, 30, 30))
    draw.text((60, 140), "Target: PRJ-TITAN-09", fill=(100, 100, 100))

    draw.rectangle([350, 100, 550, 180], fill=(230, 240, 250), outline=(52, 152, 219), width=2)
    draw.text((360, 115), "Audit & Redaction Store", fill=(30, 30, 30))
    draw.text((360, 140), "Unreviewed Image Data", fill=(100, 100, 100))

    # Connector line
    draw.line([250, 140, 350, 140], fill=(120, 120, 120), width=3)

    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def generate_pdf_fixture(output_path: Path) -> None:
    """Generates a text-native PDF fixture with selectable text, table, and figure."""
    doc = pymupdf.open()

    # Page 1: Executive Overview & Staff Details
    page1 = doc.new_page(width=595, height=842)  # A4

    # Title
    page1.insert_text((50, 60), "ARGUS EXECUTIVE PERSONNEL & PROJECT REPORT", fontsize=16, fontname="helv", color=(0.1, 0.2, 0.4))
    page1.insert_text((50, 80), "Classification: RESTRICTED / INTERNAL EYES ONLY", fontsize=10, fontname="helv", color=(0.8, 0.1, 0.1))

    # Section 1
    y = 120
    page1.insert_text((50, y), "1. Executive Summary", fontsize=13, fontname="helv", color=(0.2, 0.2, 0.2))
    y += 20
    summary_text = (
        "This confidential report summarizes project personnel assignments and budget allocations for "
        f"{FIXTURE_PII['project_code']}. All data is strictly internal to Argus Corporation. Primary office address is "
        f"{FIXTURE_PII['address']}."
    )
    rect1 = pymupdf.Rect(50, y, 545, y + 40)
    page1.insert_textbox(rect1, summary_text, fontsize=10, fontname="helv")

    # Section 2: Key Personnel
    y += 55
    page1.insert_text((50, y), "2. Key Personnel Profiles", fontsize=13, fontname="helv", color=(0.2, 0.2, 0.2))
    y += 25
    lead1 = (
        f"Principal Engineer: {FIXTURE_PII['person_1']}\n"
        f"Employee ID: {FIXTURE_PII['emp_id_1']}\n"
        f"Email: {FIXTURE_PII['email_1']}\n"
        f"Direct Phone: {FIXTURE_PII['phone_1']}\n"
        f"Base Compensation: {FIXTURE_PII['salary_1']}"
    )
    rect2 = pymupdf.Rect(50, y, 545, y + 80)
    page1.insert_textbox(rect2, lead1, fontsize=10, fontname="helv")

    y += 90
    lead2 = (
        f"Security Lead: {FIXTURE_PII['person_2']}\n"
        f"Employee ID: {FIXTURE_PII['emp_id_2']}\n"
        f"Email: {FIXTURE_PII['email_2']}\n"
        f"Direct Phone: {FIXTURE_PII['phone_2']}\n"
        f"Base Compensation: {FIXTURE_PII['salary_2']}"
    )
    rect3 = pymupdf.Rect(50, y, 545, y + 80)
    page1.insert_textbox(rect3, lead2, fontsize=10, fontname="helv")

    # Section 3: Salary Table
    y += 95
    page1.insert_text((50, y), "3. Compensation & Role Matrix", fontsize=13, fontname="helv", color=(0.2, 0.2, 0.2))
    y += 20

    # Draw table border and headers
    table_x = 50
    table_y = y
    col_w = [140, 110, 110, 135]
    row_h = 24

    # Header row
    page1.draw_rect(pymupdf.Rect(table_x, table_y, table_x + sum(col_w), table_y + row_h), color=(0.3, 0.3, 0.3), fill=(0.9, 0.9, 0.9))
    headers = ["Name", "Employee ID", "Base Salary", "Assigned Project"]
    curr_x = table_x
    for i, h in enumerate(headers):
        page1.insert_text((curr_x + 8, table_y + 16), h, fontsize=10, fontname="helv", color=(0, 0, 0))
        curr_x += col_w[i]

    # Row 1
    table_y += row_h
    page1.draw_rect(pymupdf.Rect(table_x, table_y, table_x + sum(col_w), table_y + row_h), color=(0.7, 0.7, 0.7))
    row1_vals = [FIXTURE_PII["person_1"], FIXTURE_PII["emp_id_1"], FIXTURE_PII["salary_1"], FIXTURE_PII["project_code"]]
    curr_x = table_x
    for i, v in enumerate(row1_vals):
        page1.insert_text((curr_x + 8, table_y + 16), v, fontsize=9, fontname="helv", color=(0.1, 0.1, 0.1))
        curr_x += col_w[i]

    # Row 2
    table_y += row_h
    page1.draw_rect(pymupdf.Rect(table_x, table_y, table_x + sum(col_w), table_y + row_h), color=(0.7, 0.7, 0.7))
    row2_vals = [FIXTURE_PII["person_2"], FIXTURE_PII["emp_id_2"], FIXTURE_PII["salary_2"], FIXTURE_PII["project_code"]]
    curr_x = table_x
    for i, v in enumerate(row2_vals):
        page1.insert_text((curr_x + 8, table_y + 16), v, fontsize=9, fontname="helv", color=(0.1, 0.1, 0.1))
        curr_x += col_w[i]

    # Page 2: Architecture Diagram (Image/Figure)
    page2 = doc.new_page(width=595, height=842)
    page2.insert_text((50, 60), "4. Architectural Overview & System Topology", fontsize=13, fontname="helv", color=(0.2, 0.2, 0.2))
    page2.insert_text((50, 85), "Figure 1: Project Titan Security Architecture (Image contains raster diagram)", fontsize=10, fontname="helv", color=(0.4, 0.4, 0.4))

    chart_img = create_sample_chart_image()
    img_rect = pymupdf.Rect(50, 100, 545, 310)
    page2.insert_image(img_rect, stream=chart_img)

    page2.insert_text((50, 330), "Notice: The diagram above illustrates component isolation and data boundaries.", fontsize=9, fontname="helv", color=(0.3, 0.3, 0.3))

    doc.set_metadata({
        "title": "Argus Personnel & Project Report",
        "author": FIXTURE_PII["person_1"],
        "subject": "Confidential internal report",
    })

    doc.save(str(output_path))
    doc.close()
    print(f"Generated PDF fixture at {output_path}")


def generate_docx_fixture(output_path: Path) -> None:
    """Generates a DOCX fixture with paragraphs, tables, and an inline image."""
    doc = docx.Document()

    # Core properties
    doc.core_properties.title = "Argus Personnel & Project Report"
    doc.core_properties.author = FIXTURE_PII["person_1"]
    doc.core_properties.comments = "Confidential internal report"

    # Title
    title = doc.add_heading(level=0)
    run_title = title.add_run("ARGUS EXECUTIVE PERSONNEL & PROJECT REPORT")
    run_title.font.size = Pt(18)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(26, 54, 93)

    subtitle = doc.add_paragraph()
    run_sub = subtitle.add_run("Classification: RESTRICTED / INTERNAL EYES ONLY")
    run_sub.font.size = Pt(10)
    run_sub.font.bold = True
    run_sub.font.color.rgb = RGBColor(197, 48, 48)

    # Section 1
    doc.add_heading("1. Executive Summary", level=1)
    p1 = doc.add_paragraph(
        f"This confidential report summarizes project personnel assignments and budget allocations for "
        f"{FIXTURE_PII['project_code']}. All data is strictly internal to Argus Corporation. Primary office address is "
        f"{FIXTURE_PII['address']}."
    )

    # Section 2
    doc.add_heading("2. Key Personnel Profiles", level=1)
    p2 = doc.add_paragraph()
    p2.add_run(f"Principal Engineer: {FIXTURE_PII['person_1']}\n")
    p2.add_run(f"Employee ID: {FIXTURE_PII['emp_id_1']}\n")
    p2.add_run(f"Email: {FIXTURE_PII['email_1']}\n")
    p2.add_run(f"Direct Phone: {FIXTURE_PII['phone_1']}\n")
    p2.add_run(f"Base Compensation: {FIXTURE_PII['salary_1']}")

    p3 = doc.add_paragraph()
    p3.add_run(f"Security Lead: {FIXTURE_PII['person_2']}\n")
    p3.add_run(f"Employee ID: {FIXTURE_PII['emp_id_2']}\n")
    p3.add_run(f"Email: {FIXTURE_PII['email_2']}\n")
    p3.add_run(f"Direct Phone: {FIXTURE_PII['phone_2']}\n")
    p3.add_run(f"Base Compensation: {FIXTURE_PII['salary_2']}")

    # Section 3: Table
    doc.add_heading("3. Compensation & Role Matrix", level=1)
    table = doc.add_table(rows=3, cols=4)
    table.style = "Table Grid"

    headers = ["Name", "Employee ID", "Base Salary", "Assigned Project"]
    for i, h in enumerate(headers):
        cell = table.cell(0, i)
        cell.text = h
        for p in cell.paragraphs:
            for r in p.runs:
                r.font.bold = True

    row1 = [FIXTURE_PII["person_1"], FIXTURE_PII["emp_id_1"], FIXTURE_PII["salary_1"], FIXTURE_PII["project_code"]]
    for i, v in enumerate(row1):
        table.cell(1, i).text = v

    row2 = [FIXTURE_PII["person_2"], FIXTURE_PII["emp_id_2"], FIXTURE_PII["salary_2"], FIXTURE_PII["project_code"]]
    for i, v in enumerate(row2):
        table.cell(2, i).text = v

    # Section 4: Image
    doc.add_heading("4. Architectural Overview & System Topology", level=1)
    doc.add_paragraph("Figure 1: Project Titan Security Architecture (Image contains raster diagram)")

    chart_img = create_sample_chart_image()
    img_stream = BytesIO(chart_img)
    doc.add_picture(img_stream, width=Inches(5.5))

    doc.save(str(output_path))
    print(f"Generated DOCX fixture at {output_path}")


def generate_scanned_fixture(output_path: Path) -> None:
    """Generates a scanned/image-only PDF to verify fail-closed detection."""
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)

    # Render a raster image containing text as an image (no selectable text layer)
    img = Image.new("RGB", (1200, 1600), color=(250, 250, 250))
    draw = ImageDraw.Draw(img)
    draw.text((100, 100), "SCANNED RECEIPT / CONFIDENTIAL INVOICE", fill=(40, 40, 40))
    draw.text((100, 160), "Scanned employee info: John Doe john.doe@example.com $90,000", fill=(50, 50, 50))
    draw.text((100, 220), "This document contains no embedded text layer.", fill=(80, 80, 80))

    buf = BytesIO()
    img.save(buf, format="JPEG", quality=80)
    page.insert_image(pymupdf.Rect(0, 0, 595, 842), stream=buf.getvalue())

    doc.save(str(output_path))
    doc.close()
    print(f"Generated Scanned PDF fixture at {output_path}")


def main() -> None:
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    generate_pdf_fixture(FIXTURES_DIR / "sample_report.pdf")
    generate_docx_fixture(FIXTURES_DIR / "sample_report.docx")
    generate_scanned_fixture(FIXTURES_DIR / "scanned_sample.pdf")

    readme = FIXTURES_DIR / "README.md"
    readme.write_text(
        "# Synthetic Test Fixtures for Argus RedactCore\n\n"
        "These documents contain synthetic PII for testing deterministic redaction and policy enforcement:\n\n"
        "- `sample_report.pdf`: Text-native PDF containing names, emails, phone numbers, employee IDs, salary, a table, and a figure.\n"
        "- `sample_report.docx`: DOCX containing equivalent structured content and inline image.\n"
        "- `scanned_sample.pdf`: Image-only PDF with no selectable text layer to verify fail-closed / requires-review behavior.\n"
    )
    print("All fixtures generated successfully.")


if __name__ == "__main__":
    main()
