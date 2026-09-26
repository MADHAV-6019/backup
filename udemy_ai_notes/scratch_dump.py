import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            user_data_dir="browser_data",
            headless=False,
        )
        page = await browser.new_page()
        await page.goto("https://www.udemy.com/course/complete-machine-learning-nlp-bootcamp-mlops-deployment/learn/")
        await page.wait_for_timeout(5000)
        
        try:
            # Try zoom trick
            await page.evaluate("document.body.style.zoom = '10%'")
            await page.wait_for_timeout(3000)
            
            content = await page.evaluate("""
                () => {
                    let checkboxes = document.querySelectorAll('input[type="checkbox"]');
                    return "Total visible checkboxes (lectures): " + checkboxes.length;
                }
            """)
            print("--- ZOOM TRICK RESULTS ---")
            print(content)
            print("--------------------------")
        except Exception as e:
            print("Error evaluating:", e)
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
