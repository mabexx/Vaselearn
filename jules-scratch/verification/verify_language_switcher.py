from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()
    page.goto("http://localhost:3000/en")
    page.screenshot(path="jules-scratch/verification/01-landing-page.png")
    # Click the globe icon to open the dropdown
    page.click('button:has(svg.lucide-globe)')
    page.screenshot(path="jules-scratch/verification/02-language-dropdown.png")
    # Click the "Latviešu" item in the dropdown
    page.click('div[role="menuitem"]:has-text("Latviešu")')
    page.wait_for_url("http://localhost:3000/lv")
    page.screenshot(path="jules-scratch/verification/03-latvian-page.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
