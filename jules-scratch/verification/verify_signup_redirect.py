
import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        await page.goto("http://localhost:3000/signup")

        # Use a unique email for each run to ensure it's a new user
        import time
        email = f"testuser_{int(time.time())}@example.com"

        await page.fill('input[id="first-name"]', 'Test')
        await page.fill('input[id="last-name"]', 'User')
        await page.fill('input[id="email"]', email)
        await page.fill('input[id="password"]', 'password123')
        await page.check('input[id="terms"]')
        await page.click('button[type="submit"]')

        # Wait for the navigation to the payment required page
        await page.wait_for_url("**/payment-required")

        # Assert that we are on the correct page
        await expect(page).to_have_url("http://localhost:3000/payment-required")

        await page.screenshot(path="jules-scratch/verification/signup_redirect.png")
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
