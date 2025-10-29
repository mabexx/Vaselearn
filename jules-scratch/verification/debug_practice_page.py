
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Listen for console events and print them
    page.on("console", lambda msg: print(f"CONSOLE ({msg.type}): {msg.text()}"))

    try:
        # Navigate to the practice page
        page.goto("http://localhost:3001/practice")

        # Wait for a moment to ensure all scripts have loaded and executed
        page.wait_for_timeout(2000)

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
