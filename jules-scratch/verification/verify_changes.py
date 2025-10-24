from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:3000/login")
    page.get_by_placeholder("m@example.com").fill("test@test.com")
    page.locator("#password").fill("password")
    page.get_by_role("button", name="Login").click()
    page.wait_for_url("http://localhost:3000/home")
    page.screenshot(path="jules-scratch/verification/verification.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
