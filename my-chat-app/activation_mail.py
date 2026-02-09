import requests
import msal
import secrets
from datetime import datetime, timedelta

# ===============================
# AZURE CONFIG
# ===============================
TENANT_ID = "44d0ecc3-9123-4321-ad8a-cdd4d4a9941c"
CLIENT_ID = "e33c5b02-bbbf-4fa9-9e88-a604b982f783"
CLIENT_SECRET = "c~U8Q~go39ScJtM5JSkABmX6xjhbUyUkQI1iiafx"

AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
SCOPE = ["https://graph.microsoft.com/.default"]

SENDER_EMAIL = "meeting.insights@piloggroup.com"

# ===============================
# BACKEND / FRONTEND CONFIG
# ===============================
BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"


# ===============================
# TOKEN GENERATION
# ===============================
def generate_activation_token() -> str:
    """Generates a secure random token for account activation"""
    return secrets.token_urlsafe(32)


def generate_approval_token() -> str:
    """Generates a secure token for admin approval"""
    return secrets.token_urlsafe(32)


def get_token_expiry() -> datetime:
    """Returns token expiry time (30 minutes from now)"""
    return datetime.now() + timedelta(minutes=30)


# ===============================
# AZURE ACCESS TOKEN
# ===============================
def get_access_token() -> str:
    app = msal.ConfidentialClientApplication(
        client_id=CLIENT_ID,
        authority=AUTHORITY,
        client_credential=CLIENT_SECRET
    )

    token_response = app.acquire_token_for_client(scopes=SCOPE)

    if "access_token" not in token_response:
        raise Exception(f"Azure token error: {token_response}")

    return token_response["access_token"]


# ===============================
# INTERNAL MAIL SENDER
# ===============================
def _send_mail(subject: str, html_body: str, to_email: str) -> None:
    access_token = get_access_token()

    url = f"https://graph.microsoft.com/v1.0/users/{SENDER_EMAIL}/sendMail"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    payload = {
        "message": {
            "subject": subject,
            "body": {
                "contentType": "HTML",
                "content": html_body
            },
            "toRecipients": [
                {
                    "emailAddress": {
                        "address": to_email
                    }
                }
            ]
        },
        "saveToSentItems": True
    }

    response = requests.post(url, headers=headers, json=payload)

    if response.status_code != 202:
        raise Exception(
            f"Failed to send email: {response.status_code} - {response.text}"
        )


# ===============================
# USER ACTIVATION EMAIL
# ===============================
def send_activation_email(
    recipient_email: str,
    user_name: str,
    activation_token: str
) -> bool:
    activation_link = f"{BACKEND_URL}/auth/activate?token={activation_token}"

    email_body = f"""
    <html>
        <body>
            <p>Hello {user_name},</p>

            <p>Your access to <b>IMirAI</b> has been approved.</p>

            <p>Please activate your account by clicking the link below:</p>

            <p>
                <a href="{activation_link}">
                    Activate Account
                </a>
            </p>

            <p>This link will expire in <b>30 minutes</b>.</p>

            <br>
            <p>Regards,<br>
               <b>IMirAI Team</b>
            </p>
        </body>
    </html>
    """

    _send_mail(
        subject="Activate Your IMirAI Account",
        html_body=email_body,
        to_email=recipient_email
    )

    return True


# ===============================
# ADMIN APPROVAL EMAIL (WITH ACTION LINKS)
# ===============================
def send_admin_approval_email(
    admin_email: str,
    admin_name: str,
    username: str,
    approval_token: str,   # 👈 ADD THIS
    user_name: str,
    user_email: str,
    organization: str
) -> bool:
    # approval_token = generate_approval_token()

    approve_link = (f"{BACKEND_URL}/auth/admin/approve" f"?username={username}&token={approval_token}")
    reject_link = (f"{BACKEND_URL}/auth/admin/reject" f"?username={username}&token={approval_token}")


    # approve_link = f"{BACKEND_URL}/auth/admin/approve?username={username}&token={approval_token}"
    # reject_link  = f"{BACKEND_URL}/auth/admin/reject?username={username}&token={approval_token}"


    email_body = f"""
    <html>
        <body>
            <p>Hello {admin_name},</p>

            <p>A user has requested access to <b>IMirAI</b>.</p>

            <table border="1" cellpadding="6" cellspacing="0">
                <tr><td><b>Name</b></td><td>{user_name}</td></tr>
                <tr><td><b>Email</b></td><td>{user_email}</td></tr>
                <tr><td><b>Organization</b></td><td>{organization}</td></tr>
            </table>

            <br>

            <p>
                <a href="{approve_link}"
                   style="padding:10px 16px; background:#16a34a; color:#fff; text-decoration:none; border-radius:6px;">
                   ✅ Approve
                </a>

                &nbsp;&nbsp;

                <a href="{reject_link}"
                   style="padding:10px 16px; background:#dc2626; color:#fff; text-decoration:none; border-radius:6px;">
                   ❌ Reject
                </a>
            </p>
            

            <br>
            <p>Regards,<br>
               <b>IMirAI System</b>
            </p>
        </body>
    </html>
    """

    _send_mail(
        subject="IMirAI – Approval Required",
        html_body=email_body,
        to_email=admin_email
    )

    return True


# ===============================
# USER REQUEST SUBMITTED EMAIL
# ===============================
def send_request_submitted_email(
    user_email: str,
    user_name: str
) -> bool:
    email_body = f"""
    <html>
        <body>
            <p>Hello {user_name},</p>

            <p>Your request to access <b>IMirAI</b> has been submitted.</p>

            <p>You will receive an activation email once the admin approves your request.</p>

            <br>
            <p>Regards,<br>
               <b>IMirAI Team</b>
            </p>
        </body>
    </html>
    """

    _send_mail(
        subject="IMirAI – Request Submitted",
        html_body=email_body,
        to_email=user_email
    )

    return True
