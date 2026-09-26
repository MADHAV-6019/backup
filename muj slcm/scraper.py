import os
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# ----------------------------
# Load environment variables
# ----------------------------
load_dotenv()

USERNAME = os.getenv("SLCM_USER")
PASSWORD = os.getenv("SLCM_PASS")

if not USERNAME or not PASSWORD:
    print("Username or password not found in .env file.")
    exit()

# ----------------------------
# URLs
# ----------------------------
BASE_URL = "https://mujslcm.jaipur.manipal.edu/"
LOGIN_URL = BASE_URL
DASHBOARD_URL = BASE_URL + "Home/Dashboard"
ATTENDANCE_URL = BASE_URL + "Student/Academic/GetAttendanceSummaryList"

# ----------------------------
# Create session
# ----------------------------
session = requests.Session()

base_headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Referer": BASE_URL,
    "Origin": BASE_URL,
    "Content-Type": "application/x-www-form-urlencoded"
}

# ----------------------------
# STEP 1: Load Login Page
# ----------------------------
login_page = session.get(LOGIN_URL, headers=base_headers)
if login_page.status_code != 200:
    print("Failed to load login page.")
    exit()

soup = BeautifulSoup(login_page.text, "html.parser")

token_input = soup.find("input", {"name": "__RequestVerificationToken"})
if not token_input:
    print("Login token not found.")
    exit()

token = token_input["value"]

# ----------------------------
# STEP 2: Login (Student Mode)
# ----------------------------
login_payload = {
    "__RequestVerificationToken": token,
    "UserName": USERNAME,
    "Password": PASSWORD,
    "EmailFor": "@muj.manipal.edu",
    "LoginFor": "2",
    "login_submitStudent": "Sign In"
}

login_response = session.post(
    LOGIN_URL,
    data=login_payload,
    headers=base_headers,
    allow_redirects=True
)

if "Dashboard" not in login_response.url:
    print("Login failed.")
    exit()

print("Login successful.")

# ----------------------------
# STEP 3: Load Dashboard
# ----------------------------
dashboard_response = session.get(DASHBOARD_URL, headers=base_headers)
if dashboard_response.status_code != 200:
    print("Failed to load dashboard.")
    exit()

# ----------------------------
# STEP 4: Fetch Attendance (AJAX style)
# ----------------------------
ajax_headers = base_headers.copy()
ajax_headers["X-Requested-With"] = "XMLHttpRequest"

attendance_response = session.post(
    ATTENDANCE_URL,
    headers=ajax_headers
)

if attendance_response.status_code != 200:
    print("Failed to fetch attendance.")
    exit()

attendance_data = attendance_response.json()

# ----------------------------
# STEP 5: Handle Errors
# ----------------------------
if attendance_data.get("ErrorMessage") == "UPCOMING":
    print("Attendance not available yet.")
    print(attendance_data)
    exit()

attendance_list = attendance_data.get("AttendanceSummaryList", [])

if not attendance_list:
    print("No attendance records found.")
    print(attendance_data)
    exit()

# ----------------------------
# STEP 6: Display Attendance
# ----------------------------
print("\n📊 Attendance Summary:\n")

total_classes = 0
total_present = 0

for subject in attendance_list:
    subject_name = subject.get("SubjectName", "Unknown")
    total = subject.get("TotalClasses", 0)
    present = subject.get("Present", 0)
    percentage = subject.get("AttendancePercentage", 0)

    total_classes += total
    total_present += present

    print(f"{subject_name}")
    print(f"  Total Classes: {total}")
    print(f"  Present: {present}")
    print(f"  Percentage: {percentage}%\n")

if total_classes > 0:
    overall_percentage = round((total_present / total_classes) * 100, 2)
    print("📌 Overall Attendance:", overall_percentage, "%")
else:
    print("Unable to calculate overall attendance.")