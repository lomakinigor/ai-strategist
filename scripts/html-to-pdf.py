"""Render docs/pipeline-overview.html to PDF via headless Chromium (Playwright)."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "docs" / "pipeline-overview.html"
PDF = ROOT / "docs" / "pipeline-overview.pdf"


def main() -> None:
    if not HTML.exists():
        raise SystemExit(f"HTML not found: {HTML}")

    file_url = HTML.as_uri()

    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            page = browser.new_page()
            page.goto(file_url, wait_until="networkidle")
            # Manrope from Google Fonts may need an extra moment after networkidle
            page.wait_for_timeout(800)

            page.pdf(
                path=str(PDF),
                format="A4",
                print_background=True,
                margin={
                    "top": "16mm",
                    "right": "14mm",
                    "bottom": "16mm",
                    "left": "14mm",
                },
                prefer_css_page_size=False,
            )
        finally:
            browser.close()

    size_kb = PDF.stat().st_size / 1024
    print(f"Saved: {PDF.relative_to(ROOT)} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
