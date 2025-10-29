
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:3001/practice")

        # Verify new elements are present
        expect(page.get_by_label("Custom Question (optional)")).to_be_visible()
        expect(page.get_by_label("Subject")).to_be_visible()
        expect(page.get_by_label("Difficulty")).to_be_visible()
        expect(page.get_by_label("Question Type")).to_be_visible()
        expect(page.get_by_label("Number of Questions")).to_be_visible()
        expect(page.get_by_label("AI Model")).to_be_visible()

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
