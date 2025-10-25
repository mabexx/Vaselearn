from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Navigate to the login page
    page.goto("http://localhost:3001/login")

    # Fill in dummy credentials
    page.get_by_label("Email").fill("test@example.com")
    page.get_by_label("Password").fill("password")

    # Click the login button
    page.get_by_role("button", name="Login").click()

    # Wait for navigation to the home page
    page.wait_for_url("**/home")

    # Define a specific locator for our custom select element
    custom_select = page.locator('select.border')

    # Wait for the 'Español' option to be ATTACHED to the DOM.
    spanish_option = custom_select.locator('option[value="es"]')
    spanish_option.wait_for(state='attached', timeout=20000)

    # Get the value of the Spanish option
    spanish_value = spanish_option.get_attribute('value')
    if not spanish_value:
        raise Exception("Could not find the value for the Spanish language option.")

    # Directly set the value of the select element
    custom_select.select_option(value=spanish_value)

    # Wait for the translation to take effect
    time.sleep(5)

    # Change back to English
    custom_select.select_option(value='en')

    # Wait for the page to reload
    page.wait_for_url("**/home")

    # Verify that the greeting is back in English
    expect(page.get_by_role("heading", name_pattern=r"Hello, .*!")).to_be_visible()

    # Take a screenshot to confirm
    page.screenshot(path="jules-scratch/verification/verification_language_reset.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
