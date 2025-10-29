
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the settings page and take a screenshot
        page.goto("http://localhost:3001/settings")
        page.click("text=Manage AI Studio API Key")
        page.wait_for_url("http://localhost:3001/settings/api-key")
        page.screenshot(path="jules-scratch/verification/api-key-page.png")

        # Navigate to the practice page and take a screenshot
        page.goto("http://localhost:3001/practice")
        page.screenshot(path="jules-scratch/verification/practice-page.png")

        # Click the language selector and take a screenshot
        page.click("button[aria-label='Select language']")
        page.screenshot(path="jules-scratch/verification/language-selector.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
