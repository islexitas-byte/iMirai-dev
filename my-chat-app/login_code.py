from activation_mail import (
    generate_activation_token,
    # get_token_expiry,
    send_activation_email,
    send_admin_approval_email,
    send_request_submitted_email
)
from fastapi import FastAPI, HTTPException, Form
from typing import Optional
from deps import get_connection
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173",'https://mirai.pilogcloud.com'],  # Vite default
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.post('/auth/login')
def login_auth(username: str = Form(...), password: str = Form(...)):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""SELECT NAME, CONTENT_AUTHORIZATION, IS_ACTIVE,ROLE FROM PKA_LOGIN WHERE USER_NAME = :0 AND PASSWORD = :1""", (username, password))

    result = cur.fetchone()

    cur.close()
    conn.close()

    if not result:
        # ❌ Invalid credentials
        raise HTTPException(status_code=404, detail="User not found")

    name, content_auth, is_active, role = result

    if is_active == 0:
        # 🔒 Account exists but NOT activated
        raise HTTPException(
            status_code=403,
            detail="Account not activated. Please check your email or resend activation link."
        )

    # ✅ Login allowed
    return {
        'name': name,
        'username': username,
        'CONTENT_AUTHORIZATION': content_auth,
        'role': role
    }

@app.post('/auth/register')
def user_register(
    name: str = Form(...),
    username: str = Form(...),
    password: str = Form(...),
    email: str = Form(...),
    organization: str = Form(...),
    registration_type: str = Form(...),
    referred_admin: Optional[str] = Form(None)
):
    conn = get_connection()
    cur = conn.cursor()
    print('yes')
    # try:
    # 🔍 CHECK EMAIL
    cur.execute("SELECT 1 FROM PKA_LOGIN WHERE EMAIL_ID = :0", (email,))
    if cur.fetchone():
        raise HTTPException(status_code=409, detail="EMAIL_EXISTS")

    # 🔍 CHECK USERNAME
    cur.execute("SELECT 1 FROM PKA_LOGIN WHERE USER_NAME = :0", (username,))
    if cur.fetchone():
        raise HTTPException(status_code=409, detail="USERNAME_EXISTS")

    # =====================================================
    # CASE 1: DIRECT (PiLog users)
    # =====================================================
    if registration_type == "DIRECT":
        activation_token = generate_activation_token()

        cur.execute("""INSERT INTO PKA_LOGIN(NAME, USER_NAME, PASSWORD, CREATE_DATE, EMAIL_ID, AUDIT_ID, CONTENT_AUTHORIZATION, ORGANIZATION,
                IS_ACTIVE, ACTIVATION_TOKEN, TOKEN_EXPIRY, REGISTRATION_TYPE, APPROVAL_STATUS)
            VALUES(:name, :username, :password, SYSDATE, :email, SYS_GUID(), 'N', :organization, 0, :token, SYSDATE + INTERVAL '30' MINUTE,'DIRECT', 'APPROVED')""", 
            {"name": name, "username": username, "password": password, "email": email, "organization": organization, "token": activation_token})

        conn.commit()

        send_activation_email(email, name, activation_token)
        return {"message": "Account created. Please check your email to activate your account."}

    # =====================================================
    # CASE 2: ADMIN APPROVAL (Others)
    # =====================================================
    elif registration_type == "ADMIN_APPROVAL":

        if not referred_admin:
            raise HTTPException(status_code=400, detail="REFERRED_ADMIN_REQUIRED")

        # 🔍 Admin lookup (NAME → ID)
        cur.execute("""SELECT ADMIN_ID, NAME, EMAIL_ID FROM PKA_APPROVAL_ADMINS WHERE NAME = :0 AND IS_ACTIVE = 1""", (referred_admin,))
        admin_row = cur.fetchone()

        if not admin_row:
            raise HTTPException(status_code=404, detail="Invalid approval admin")

        admin_id, admin_name, admin_email = admin_row
        approval_token = generate_activation_token()

        # 📝 Insert pending user
        cur.execute("""
            INSERT INTO PKA_LOGIN(
                NAME, USER_NAME, PASSWORD, CREATE_DATE, EMAIL_ID,
                AUDIT_ID, CONTENT_AUTHORIZATION, ORGANIZATION,
                IS_ACTIVE, REGISTRATION_TYPE, APPROVAL_STATUS,
                REFERRED_APPROVAL_ID, APPROVAL_TOKEN
            )
            VALUES(
                :name, :username, :password, SYSDATE, :email,
                SYS_GUID(), 'N', :organization,
                0, 'ADMIN_APPROVAL', 'PENDING',
                :admin_id, :approval_token)
        """, {"name": name, "username": username, "password": password, "email": email, "organization": organization, "admin_id": admin_id, "approval_token": approval_token})

        conn.commit()

        # 📧 Mail admin (approve / reject)
        send_admin_approval_email(
            admin_email=admin_email,
            admin_name=admin_name,
            username=username,
            approval_token=approval_token,  # ✅ SAME TOKEN AS DB
            user_name=name,
            user_email=email,
            organization=organization
        )


        # 📧 Mail user (submitted)
        send_request_submitted_email(email, name)

        return {"message": "Request submitted. You will receive an activation link once approved."}

    else:
        raise HTTPException(status_code=400, detail="INVALID_REGISTRATION_TYPE")

    # except HTTPException:
    #     raise

    # except Exception as e:
    #     print("REGISTER ERROR:", e)
    #     raise HTTPException(status_code=500, detail="Unable to SIGN UP Now")

    # finally:
        # cur.close()
        # conn.close()

@app.get("/auth/activate")
def activate_user(token: str):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""UPDATE PKA_LOGIN SET IS_ACTIVE = 1, ACTIVATION_TOKEN = NULL, TOKEN_EXPIRY = NULL WHERE ACTIVATION_TOKEN = :token AND TOKEN_EXPIRY > SYSDATE AND IS_ACTIVE = 0""", {"token": token})

    if cur.rowcount != 1:
        conn.rollback()
        cur.close()
        conn.close()
        return HTMLResponse(
            content="""
            <h2 style="color:red;">Invalid or expired activation link.</h2>
            <p>Please request a new activation email.</p>
            """,
            status_code=400
        )

    conn.commit()
    cur.close()
    conn.close()

    return HTMLResponse(
        content="""
        <html>
            <head>
                <title>Account Activated</title>
            </head>
            <body style="font-family:Arial; text-align:center; margin-top:60px;">
                <h2 style="color:green;">
                    Your account is activated, you can Sign in now.
                </h2>
                <p>You may close this tab and return to iMirAI.</p>
            </body>
        </html>
        """,
        status_code=200
    )

# ------------------------------------------------------------
# ADMIN APPROVE
# ------------------------------------------------------------
@app.get("/auth/admin/approve")
def admin_approve(username: str, token: str):
    conn = get_connection()
    cur = conn.cursor()

    try:
        # 🔍 Validate approval request
        cur.execute("""SELECT EMAIL_ID, NAME FROM PKA_LOGIN WHERE USER_NAME = :uname AND APPROVAL_TOKEN = :token AND APPROVAL_STATUS = 'PENDING'""", {"uname": username, "token": token})

        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=400, detail="Invalid or expired approval request")

        user_email, user_name = row
        activation_token = generate_activation_token()

        # ✅ Approve user
        cur.execute("""
            UPDATE PKA_LOGIN
            SET APPROVAL_STATUS = 'APPROVED',
                APPROVED_DATE = SYSDATE,
                ACTIVATION_TOKEN = :act_token,
                TOKEN_EXPIRY = SYSDATE + INTERVAL '30' MINUTE
            WHERE USER_NAME = :uname
        """, {"act_token": activation_token, "uname": username})

        conn.commit()

        send_activation_email(user_email, user_name, activation_token)

        return HTMLResponse(
            content="""
            <h2 style="color:green;text-align:center;">
                User approved successfully.<br>
                Activation email sent.
            </h2>
            """,
            status_code=200
        )

    except HTTPException:
        raise

    except Exception as e:
        print("ADMIN APPROVE ERROR:", e)
        raise HTTPException(status_code=500, detail="Unable to approve user")

    finally:
        cur.close()
        conn.close()

# ------------------------------------------------------------
# ADMIN REJECT
# ------------------------------------------------------------
@app.get("/auth/admin/reject")
def admin_reject(username: str, token: str):
    conn = get_connection()
    cur = conn.cursor()

    try:
        # 🔍 Validate approval request
        cur.execute("""SELECT 1 FROM PKA_LOGIN WHERE USER_NAME = :uname AND APPROVAL_TOKEN = :token AND APPROVAL_STATUS = 'PENDING'""", {"uname": username, "token": token})

        if not cur.fetchone():
            raise HTTPException(status_code=400, detail="Invalid or expired approval request")

        # ❌ Reject
        cur.execute("""
            UPDATE PKA_LOGIN
            SET APPROVAL_STATUS = 'REJECTED',
                APPROVED_DATE = SYSDATE
            WHERE USER_NAME = :uname
        """, {"uname": username})

        conn.commit()

        return HTMLResponse(
            content="""
            <h2 style="color:red;text-align:center;">
                User request rejected.
            </h2>
            """,
            status_code=200
        )

    except HTTPException:
        raise

    except Exception as e:
        print("ADMIN REJECT ERROR:", e)
        raise HTTPException(status_code=500, detail="Unable to reject user")

    finally:
        cur.close()
        conn.close()

@app.post('/auth/resend-activation')
def resend_activation(email: str = Form(...)):
    conn = get_connection()
    cur = conn.cursor()

    try:
        # 🔍 Check inactive but approved user
        cur.execute("""SELECT NAME FROM PKA_LOGIN WHERE EMAIL_ID = :0 AND IS_ACTIVE = 0 AND APPROVAL_STATUS = 'APPROVED'""", (email,))
        user = cur.fetchone()

        if not user:
            raise HTTPException(
                status_code=400,
                detail="Account already activated or email not found"
            )

        user_name = user[0]
        new_token = generate_activation_token()

        # ✅ Use ORACLE time for expiry
        cur.execute("""
            UPDATE PKA_LOGIN
            SET ACTIVATION_TOKEN = :0,
                TOKEN_EXPIRY = SYSDATE + INTERVAL '30' MINUTE
            WHERE EMAIL_ID = :1
        """, (new_token, email))

        conn.commit()

        # 📧 Send activation email
        send_activation_email(
            recipient_email=email,
            user_name=user_name,
            activation_token=new_token
        )

        return {
            "message": "New activation link sent. Please check your email."
        }

    except HTTPException:
        raise

    except Exception as e:
        print("RESEND ACTIVATION ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail="Unable to resend activation link"
        )

    finally:
        cur.close()
        conn.close()