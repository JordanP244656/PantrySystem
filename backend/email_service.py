import smtplib
import json
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "email_settings.json")


def load_settings():
    if not os.path.exists(SETTINGS_FILE):
        return {}
    with open(SETTINGS_FILE) as f:
        return json.load(f)


def save_settings(settings: dict):
    with open(SETTINGS_FILE, "w") as f:
        json.dump(settings, f, indent=2)


def send_email(subject: str, body: str):
    s = load_settings()
    if not s.get("enabled") or not s.get("to_email") or not s.get("smtp_user"):
        return False, "Email not configured"
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = s["smtp_user"]
        msg["To"] = s["to_email"]
        msg.attach(MIMEText(body, "html"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(s["smtp_user"], s["smtp_password"])
            server.sendmail(s["smtp_user"], s["to_email"], msg.as_string())
        return True, "Sent"
    except Exception as e:
        return False, str(e)


def build_stock_summary_email(store: str, items: list) -> tuple:
    subject = f"PantrySystem — Stock loaded from {store} ({len(items)} items)"
    rows = "".join(f"<tr><td style='padding:6px 12px;border-bottom:1px solid #eee'>{i['name']}</td><td style='padding:6px 12px;border-bottom:1px solid #eee;text-align:center'>{i['qty']}</td></tr>" for i in items)
    body = f"""
    <h2 style='color:#1e40af'>Stock Loaded — {store}</h2>
    <p>{datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
    <table style='border-collapse:collapse;width:100%;max-width:500px'>
      <tr style='background:#f1f5f9'><th style='padding:8px 12px;text-align:left'>Item</th><th style='padding:8px 12px'>Qty</th></tr>
      {rows}
    </table>
    <p style='color:#64748b;font-size:12px'>PantrySystem</p>
    """
    return subject, body


def build_weekly_report_email(low_stock: list, unused: list) -> tuple:
    subject = f"PantrySystem — Weekly Report ({datetime.now().strftime('%b %d')})"
    low_rows = "".join(f"<tr><td style='padding:6px 12px;border-bottom:1px solid #eee'>{i['item_name']}</td><td style='padding:6px 12px;border-bottom:1px solid #eee;color:#dc2626;text-align:center'>{i['total_remaining']} left</td></tr>" for i in low_stock) or "<tr><td colspan='2' style='padding:8px 12px;color:#64748b'>All good!</td></tr>"
    unused_rows = "".join(f"<tr><td style='padding:6px 12px;border-bottom:1px solid #eee'>{i['item_name']}</td><td style='padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;text-align:center'>{i['days_since']}d ago</td></tr>" for i in unused) or "<tr><td colspan='2' style='padding:8px 12px;color:#64748b'>Everything is being used!</td></tr>"
    body = f"""
    <h2 style='color:#1e40af'>Weekly Pantry Report</h2>
    <p>{datetime.now().strftime('%B %d, %Y')}</p>
    <h3 style='color:#dc2626'>Low Stock</h3>
    <table style='border-collapse:collapse;width:100%;max-width:500px'>
      <tr style='background:#fef2f2'><th style='padding:8px 12px;text-align:left'>Item</th><th style='padding:8px 12px'>Stock</th></tr>
      {low_rows}
    </table>
    <h3 style='color:#92400e;margin-top:24px'>Hasn't Been Used in 14+ Days</h3>
    <table style='border-collapse:collapse;width:100%;max-width:500px'>
      <tr style='background:#fffbeb'><th style='padding:8px 12px;text-align:left'>Item</th><th style='padding:8px 12px'>Last Used</th></tr>
      {unused_rows}
    </table>
    <p style='color:#64748b;font-size:12px;margin-top:24px'>PantrySystem</p>
    """
    return subject, body
