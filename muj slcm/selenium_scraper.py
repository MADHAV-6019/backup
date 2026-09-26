import os
import json
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

load_dotenv()

USERNAME = os.getenv("SLCM_USER")
PASSWORD = os.getenv("SLCM_PASS")

BASE_URL = "https://mujslcm.jaipur.manipal.edu"
ATTENDANCE_PAGE = BASE_URL + "/Student/Academic/AttendanceSummaryForStudent"

chrome_options = Options()
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--window-size=1920,1080")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--no-sandbox")

driver = webdriver.Chrome(
    service=Service(ChromeDriverManager().install()),
    options=chrome_options
)

wait = WebDriverWait(driver, 40)

try:
    # ---------------- LOGIN ----------------
    driver.get(BASE_URL)

    wait.until(EC.presence_of_element_located((By.ID, "txtUserName"))).send_keys(USERNAME)
    driver.find_element(By.ID, "txtPassword").send_keys(PASSWORD)
    driver.find_element(By.ID, "login_submitStudent").click()

    wait.until(EC.url_contains("Dashboard"))
    print("Login successful.")

    # ---------------- OPEN ATTENDANCE PAGE ----------------
    driver.get(ATTENDANCE_PAGE)

    # Execute same JS function frontend uses
    driver.execute_script("onSearchClick();")

    # Wait until AttendanceSummaryList is populated internally
    wait.until(lambda d: "AttendanceSummaryList" in d.page_source)

    # Fetch JSON directly via JS
    attendance_data = driver.execute_script("""
        return fetch('/Student/Academic/GetAttendanceSummaryList', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include',
            body: 'StudentCode='
        }).then(res => res.json());
    """)

    attendance_list = attendance_data.get("AttendanceSummaryList", [])

    if not attendance_list:
        print("No attendance data found.")
        print(attendance_data)
        exit()

    print("\n📊 Attendance Summary:\n")

    total_present = 0
    total_classes = 0

    for subject in attendance_list:
        name = subject.get("CourseID")
        present = subject.get("Present")
        total = subject.get("Total")
        percentage = subject.get("Percentage")

        if present and total and total.isdigit():
            total_present += int(present)
            total_classes += int(total)

        print(f"{name}")
        print(f"  Present: {present}")
        print(f"  Total: {total}")
        print(f"  Percentage: {percentage}%\n")

    if total_classes > 0:
        overall = round((total_present / total_classes) * 100, 2)
        print("📌 Overall Attendance:", overall, "%")
    else:
        print("Could not calculate overall attendance.")

finally:
    driver.quit()



    #app3.py