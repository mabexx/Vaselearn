
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Login
    page.goto("http://localhost:3000/login")
    page.get_by_label("Email").fill("test@example.com")
    page.get_by_label("Password").fill("password")
    page.get_by_role("button", name="Login").click()
    page.wait_for_url("http://localhost:3000/home")

    # Go to flashcards page
    page.goto("http://localhost:3000/flashcards")
    page.screenshot(path="jules-scratch/verification/flashcards-initial.png")

    # Create a new collection
    collection_name = "My New Collection"
    page.get_by_role("button", name="Create Collection").click()
    page.wait_for_selector('div[role="dialog"]')
    page.get_by_label("Collection Name").fill(collection_name)
    page.get_by_label("Topic").fill("My Topic")
    page.get_by_role("button", name="Create").click()
    page.wait_for_timeout(1000)
    page.keyboard.press("Escape")


    # Select the new collection from the dropdown
    page.get_by_role("button", name="Mistake Vault").click()
    page.wait_for_selector(f'text="{collection_name}"')
    page.get_by_role("menuitem", name=collection_name).click()
    page.screenshot(path="jules-scratch/verification/flashcards-collection-selected.png")

    # Add a flashcard
    page.get_by_label("Question").fill("What is the capital of France?")
    page.get_by_label("Answer").fill("Paris")
    page.get_by_role("button", name="Save Flashcard").click()
    page.wait_for_selector('text="What is the capital of France?"')
    page.screenshot(path="jules-scratch/verification/flashcards-flashcard-created.png")

    # Close browser
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
