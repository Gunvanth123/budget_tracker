import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import random
import string

def send_email(to_email: str, subject: str, body: str):
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not smtp_user or not smtp_password:
        print("SMTP credentials not configured. Email not sent.")
        return False

    msg = MIMEMultipart()
    msg['From'] = smtp_user
    msg['To'] = to_email
    msg['Subject'] = subject

    msg.attach(MIMEText(body, 'html'))

    try:
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def generate_otp(length=6):
    return ''.join(random.choices(string.digits, k=length))

def send_verification_otp(email: str, otp: str):
    subject = "Verify your Budget Tracker Account"
    body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; rounded: 8px;">
                <h2 style="color: #6366f1; text-align: center;">Welcome to Budget Tracker!</h2>
                <p>Hello,</p>
                <p>Thank you for signing up. Please use the following code to verify your email address. This code is valid for 10 minutes.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; background: #f3f4f6; padding: 10px 20px; border-radius: 4px;">
                        {otp}
                    </span>
                </div>
                <p>If you did not request this code, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #666; text-align: center;">Secure Budget Tracker & Planner © 2026</p>
            </div>
        </body>
    </html>
    """
    return send_email(email, subject, body)

def send_mfa_otp(email: str, otp: str):
    subject = f"{otp} is your Budget Tracker security code"
    body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; rounded: 8px;">
                <h2 style="color: #6366f1; text-align: center;">Security Verification</h2>
                <p>Hello,</p>
                <p>Your security code for logging in is:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; background: #f3f4f6; padding: 10px 20px; border-radius: 4px;">
                        {otp}
                    </span>
                </div>
                <p>This code will expire in 10 minutes.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #666; text-align: center;">Secure Budget Tracker & Planner © 2026</p>
            </div>
        </body>
    </html>
    """
    return send_email(email, subject, body)
