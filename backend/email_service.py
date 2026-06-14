import resend
import json
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

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
    api_key = s.get("resend_api_key") or os.environ.get("RESEND_API_KEY", "")
    to_emails = s.get("to_emails", [])
    # backwards compat
    if not to_emails and s.get("to_email"):
        to_emails = [s["to_email"]]
    from_email = s.get("from_email", "pantryupdates@playsbot.cc")

    if not api_key:
        return False, "Resend API key not set — add it in Reports → Email"
    if not to_emails:
        return False, "No recipient emails configured"

    try:
        resend.api_key = api_key
        resend.Emails.send({
            "from": f"Pollack Family Pantry <{from_email}>",
            "to": to_emails,
            "subject": subject,
            "html": body,
        })
        return True, "Sent"
    except Exception as e:
        return False, str(e)


def build_stock_summary_email(store: str, items: list) -> tuple:
    subject = f"Pollack Family Pantry — Stock loaded from {store} ({len(items)} items)"
    rows = "".join(
        f"<tr><td style='padding:6px 12px;border-bottom:1px solid #eee'>{i['name']}</td>"
        f"<td style='padding:6px 12px;border-bottom:1px solid #eee;text-align:center'>{i['qty']}</td></tr>"
        for i in items
    )
    body = f"""
    <div style='font-family:Inter,sans-serif;max-width:560px;margin:0 auto'>
      <div style='background:#166534;padding:24px;border-radius:12px 12px 0 0'>
        <h1 style='color:white;margin:0;font-size:20px'>🥫 Pollack Family Pantry</h1>
        <p style='color:#bbf7d0;margin:4px 0 0'>Stock Loaded — {store}</p>
      </div>
      <div style='background:white;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px'>
        <p style='color:#64748b;margin:0 0 16px'>{datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
        <table style='border-collapse:collapse;width:100%'>
          <tr style='background:#f0fdf4'><th style='padding:8px 12px;text-align:left;color:#166534'>Item</th><th style='padding:8px 12px;color:#166534'>Qty</th></tr>
          {rows}
        </table>
        <p style='color:#94a3b8;font-size:12px;margin-top:24px'>Pollack Family Pantry System</p>
      </div>
    </div>
    """
    return subject, body


def build_weekly_report_email(low_stock: list, unused: list) -> tuple:
    subject = f"Pollack Family Pantry — Weekly Report ({datetime.now().strftime('%b %d')})"
    low_rows = "".join(
        f"<tr><td style='padding:6px 12px;border-bottom:1px solid #eee'>{i['item_name']}</td>"
        f"<td style='padding:6px 12px;border-bottom:1px solid #eee;color:#dc2626;text-align:center;font-weight:bold'>{i['total_remaining']} left</td></tr>"
        for i in low_stock
    ) or "<tr><td colspan='2' style='padding:8px 12px;color:#64748b'>All good — nothing low!</td></tr>"
    unused_rows = "".join(
        f"<tr><td style='padding:6px 12px;border-bottom:1px solid #eee'>{i['item_name']}</td>"
        f"<td style='padding:6px 12px;border-bottom:1px solid #eee;color:#64748b;text-align:center'>{i['days_since']}d ago</td></tr>"
        for i in unused
    ) or "<tr><td colspan='2' style='padding:8px 12px;color:#64748b'>Everything is being used!</td></tr>"
    body = f"""
    <div style='font-family:Inter,sans-serif;max-width:560px;margin:0 auto'>
      <div style='background:#166534;padding:24px;border-radius:12px 12px 0 0'>
        <h1 style='color:white;margin:0;font-size:20px'>🥫 Pollack Family Pantry</h1>
        <p style='color:#bbf7d0;margin:4px 0 0'>Weekly Report — {datetime.now().strftime('%B %d, %Y')}</p>
      </div>
      <div style='background:white;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px'>
        <h2 style='color:#dc2626;font-size:16px;margin:0 0 12px'>⚠️ Low Stock</h2>
        <table style='border-collapse:collapse;width:100%;margin-bottom:24px'>
          <tr style='background:#fef2f2'><th style='padding:8px 12px;text-align:left;color:#dc2626'>Item</th><th style='padding:8px 12px;color:#dc2626'>Stock</th></tr>
          {low_rows}
        </table>
        <h2 style='color:#92400e;font-size:16px;margin:0 0 12px'>💤 Hasn't Been Used in 14+ Days</h2>
        <table style='border-collapse:collapse;width:100%'>
          <tr style='background:#fffbeb'><th style='padding:8px 12px;text-align:left;color:#92400e'>Item</th><th style='padding:8px 12px;color:#92400e'>Last Used</th></tr>
          {unused_rows}
        </table>
        <p style='color:#94a3b8;font-size:12px;margin-top:24px'>Pollack Family Pantry System</p>
      </div>
    </div>
    """
    return subject, body
