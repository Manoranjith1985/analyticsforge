"""
Email Service — send scheduled reports via SMTP.
Configure SMTP settings via environment variables.
"""
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional
import os


class EmailService:

    def __init__(self):
        self.host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.port = int(os.getenv("SMTP_PORT", "587"))
        self.username = os.getenv("SMTP_USERNAME", "")
        self.password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("SMTP_FROM", self.username)
        self.from_name = os.getenv("SMTP_FROM_NAME", "AnalyticsForge")

    def send(
        self,
        recipients: List[str],
        subject: str,
        body_html: str,
        attachment_bytes: Optional[bytes] = None,
        attachment_filename: Optional[str] = None,
        attachment_mime: str = "application/pdf",
    ) -> bool:
        if not self.username or not self.password:
            print("[EmailService] SMTP not configured — skipping email send")
            return False

        msg = MIMEMultipart("mixed")
        msg["From"] = f"{self.from_name} <{self.from_email}>"
        msg["To"] = ", ".join(recipients)
        msg["Subject"] = subject

        msg.attach(MIMEText(body_html, "html"))

        if attachment_bytes and attachment_filename:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment_bytes)
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", f'attachment; filename="{attachment_filename}"')
            msg.attach(part)

        try:
            context = ssl.create_default_context()
            with smtplib.SMTP(self.host, self.port) as server:
                server.ehlo()
                server.starttls(context=context)
                server.login(self.username, self.password)
                server.sendmail(self.from_email, recipients, msg.as_string())
            return True
        except Exception as e:
            print(f"[EmailService] Send failed: {e}")
            return False

    def send_report(
        self,
        recipients: List[str],
        report_name: str,
        attachment_bytes: bytes,
        attachment_filename: str,
        format: str = "pdf",
    ) -> bool:
        subject = f"AnalyticsForge Report: {report_name}"
        body = f"""
        <html><body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px;">
            <h2 style="color:#4f46e5;">AnalyticsForge</h2>
            <p>Your scheduled report <strong>{report_name}</strong> is ready.</p>
            <p>Please find the {format.upper()} report attached.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">
            <p style="font-size:12px;color:#94a3b8;">
              This is an automated report from AnalyticsForge.
            </p>
          </div>
        </body></html>
        """
        return self.send(recipients, subject, body, attachment_bytes, attachment_filename)
