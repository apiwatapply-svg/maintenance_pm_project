"""
PM Email Sender - Level Oil Alert
=================================
ส่ง Email แจ้งเตือนเมื่อ 'Level' ของ PM = 1 (ระดับต่ำสุด)
จากการทำ PM ครั้งล่าสุด

อ้างอิง Machine Type -> PM Type:
- Oilfil Machine   -> Level oil pump oilfil Gen2 (1022)
- Oilfil Machine   -> Level oil pump oilfil Gen3 (1023)
- Helium leak test -> Level oil pump helium (1020)
- oil level        -> Level Oil Pump VNS (1021)
- vacuum oven      -> Level Oil Pump Hold Oil (1024)

ค่า 1 หมายถึง Dropdown 1 ใน PMRecordDetail
อ้างอิงที่อยู่อีเมลจากไฟล์ .env
"""

import os
import argparse
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from dotenv import load_dotenv
import pyodbc

# Load environment variables
load_dotenv()

# =============================================
# Configuration
# =============================================
DB_SERVER = os.getenv('DB_SERVER', '192.168.98.10')
DB_NAME = os.getenv('DB_NAME', 'db_mm')
DB_USER = os.getenv('DB_USER', 'sa')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'Sa@admin')

SMTP_HOST = os.getenv('SMTP_HOST', '192.168.98.1')
SMTP_PORT = int(os.getenv('SMTP_PORT', '25'))
SMTP_FROM = os.getenv('SMTP_FROM', 'apiwat.n@minebea.co.th')
EMAIL_RECIPIENTS = os.getenv('EMAIL_RECIPIENTS', '')

# IDs ของ PM Type ที่เกี่ยวข้อง
TARGET_PREVENTIVE_TYPE_IDS = (1020, 1021, 1022, 1023, 1024)

def get_db_connection():
    """Connect to SQL Server database"""
    conn_str = (
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={DB_SERVER};"
        f"DATABASE={DB_NAME};"
        f"UID={DB_USER};"
        f"PWD={DB_PASSWORD}"
    )
    return pyodbc.connect(conn_str)

def get_level_alerts(conn):
    """
    ดึงข้อมูล PMRecord ครั้งล่าสุดของแต่ละเครื่อง (แยกตาม preventiveTypeId)
    จากนั้นกรองเฉพาะ PMRecordDetail ที่ topic='Level' และ value='1'
    """
    cursor = conn.cursor()
    
    # Query นี้จะหาบรรทัดล่าสุดของแต่ละเครื่อง/ประเภท แล้วเอามาเชื่อมกับ PMRecordDetail
    query = f"""
    WITH LatestPM AS (
        SELECT 
            id, machineId, preventiveTypeId, date,
            ROW_NUMBER() OVER(
                PARTITION BY machineId, preventiveTypeId 
                ORDER BY date DESC, id DESC
            ) as rn
        FROM PMRecord WITH(NOLOCK)
        WHERE preventiveTypeId IN ({','.join(map(str, TARGET_PREVENTIVE_TYPE_IDS))})
          AND status = 'COMPLETED'
    )
    SELECT 
        mt.name as machineTypeName,
        m.name as machineName,
        pt.name as pmTypeName,
        d.subItemName as pumpName,
        l.date as pmDate,
        m.code as machineCode
    FROM LatestPM l
    JOIN PMRecordDetail d WITH(NOLOCK) ON l.id = d.recordId
    JOIN Machine m WITH(NOLOCK) ON l.machineId = m.id
    JOIN MachineMaster mm WITH(NOLOCK) ON m.machineMasterId = mm.id
    JOIN MachineType mt WITH(NOLOCK) ON mm.machineTypeId = mt.id
    JOIN PreventiveType pt WITH(NOLOCK) ON l.preventiveTypeId = pt.id
    WHERE l.rn = 1 
      AND d.topic LIKE '%Level%' 
      AND d.value = '1'
    ORDER BY mt.name, m.name
    """
    
    cursor.execute(query)
    columns = [column[0] for column in cursor.description]
    
    alerts = []
    for row in cursor.fetchall():
        alerts.append(dict(zip(columns, row)))
        
    return alerts

def build_email_html(alerts):
    """สร้าง HTML template สำหรับอีเมลแจ้งเตือน"""
    if not alerts:
        return None
        
    sent_date = datetime.now().strftime('%d/%m/%Y %H:%M')
    
    # รูปแบบการแสดงผลแต่ละบรรทัด (ตาราง)
    rows_html = ""
    for item in alerts:
        # แปลงวันที่ให้อ่านง่าย
        pm_date = item['pmDate']
        if isinstance(pm_date, datetime):
            pm_date_str = pm_date.strftime('%d/%m/%Y')
        elif hasattr(pm_date, 'date'):
            pm_date_str = pm_date.date().strftime('%d/%m/%Y')
        else:
            pm_date_str = str(pm_date)
            
        rows_html += f"""
        <tr style="background-color: #ffebee;">
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">{item['machineTypeName']}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;"><strong>{item['machineCode']}</strong><br><span style="font-size: 12px; color: #666;">{item['machineName']}</span></td>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">{item['pmTypeName']}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #d32f2f;">{item['pumpName']}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center;">{pm_date_str}</td>
        </tr>
        """
    
    html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 1000px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #d32f2f 0%, #ef5350 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
                🔴 Alert: Pump Oil Level is Low (Level 1)
            </h1>
        </div>
        
        <!-- Alert Info -->
        <div style="padding: 25px; background-color: #ffebee; border-bottom: 1px solid #ffcdd2;">
            <p style="margin: 0; font-size: 16px; color: #b71c1c;">
                <strong>Low pump oil levels (Level = 1) were detected during the latest PM checks.</strong><br>
                Please inspect and refill the oil for the items listed below:
            </p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
                <strong>Detection Time:</strong> {sent_date}
            </p>
        </div>
        
        <!-- Table -->
        <div style="padding: 25px;">
            <h2 style="color: #333; margin-top: 0; font-size: 18px;">
                📋 Pumps Requiring Attention ({len(alerts)} items)
            </h2>
            <table style="width: 100%; border-collapse: collapse; background-color: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <thead>
                    <tr style="background-color: #b71c1c; color: #fff;">
                        <th style="padding: 14px; text-align: left; width: 15%;">Machine Type</th>
                        <th style="padding: 14px; text-align: left; width: 25%;">Machine</th>
                        <th style="padding: 14px; text-align: left; width: 30%;">PM Type</th>
                        <th style="padding: 14px; text-align: left; width: 20%;">Pump / Sub-item</th>
                        <th style="padding: 14px; text-align: center; width: 10%;">PM Date</th>
                    </tr>
                </thead>
                <tbody>
                    {rows_html}
                </tbody>
            </table>
        </div>
        
        <!-- Contact Info -->
        <div style="padding: 20px 25px; background-color: #FAFAFA; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #555;">
                <strong>If you have any questions, please contact:</strong>
            </p>
            <ul style="margin: 0; padding-left: 20px; color: #666; font-size: 14px;">
                <li>Apiwat Nonut, Tel: 2018, IoT Section</li>
                <li>Panachai Poochomchuan, Tel: 2016, Maintenance Section</li>
            </ul>
        </div>
        
        <!-- Footer -->
        <div style="padding: 15px; background-color: #37474F; text-align: center;">
            <p style="color: #B0BEC5; margin: 0; font-size: 12px;">
                Automated notification sent from PM Maintenance System
            </p>
        </div>
        
    </div>
</body>
</html>
    """.strip()
    return html

def send_email(to_emails, subject, html_body):
    """ส่งอีเมลผ่าน SMTP Relay"""
    if not SMTP_FROM:
        print("❌ Error: SMTP_FROM is not configured")
        return False
        
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = SMTP_FROM
    msg['To'] = to_emails
    
    msg.attach(MIMEText(html_body, 'html', 'utf-8'))
    
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.sendmail(SMTP_FROM, to_emails.split(','), msg.as_string())
        print(f"📧 ส่งอีเมลสำเร็จถึง: {to_emails}")
        return True
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาดในการส่งอีเมล: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Level Oil Email Sender")
    parser.add_argument("--dry-run", action="store_true", help="Print alerts without sending email")
    parser.add_argument("--test-email", type=str, help="Send email to a test address instead of .env config")
    parser.add_argument("--test-db", action="store_true", help="Test database query and print results")
    args = parser.parse_args()

    print("=" * 60)
    print(f"🔧 Level Oil Alert Sender - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    try:
        conn = get_db_connection()
        print(f"✅ เชื่อมต่อฐานข้อมูลสำเร็จ: {DB_SERVER}/{DB_NAME}")
        
        print("🔍 กำลังค้นหาข้อมูลการทำ PM ครั้งล่าสุดที่ Level = 1...")
        alerts = get_level_alerts(conn)
        
        if args.test_db or args.dry_run:
            print(f"\n📊 พบรายการ Level 1 ทั้งหมด {len(alerts)} รายการ:")
            for idx, a in enumerate(alerts, 1):
                date_str = a['pmDate'].date().strftime('%Y-%m-%d') if hasattr(a['pmDate'], 'date') else str(a['pmDate'])
                print(f"  {idx}. [{a['machineTypeName']}] {a['machineCode']} - {a['pmTypeName']} -> {a['pumpName']} (PM Date: {date_str})")
            
            if args.test_db:
                print("\n✅ ทดสอบ Query ฐานข้อมูลเรียบร้อย")
                conn.close()
                return
                
        if not alerts:
            print("🎉 No pump found with Level = 1. No email sent.")
            conn.close()
            return
            
        print(f"⚠️ {len(alerts)} items require attention")
        
        # ตัดสินใจส่งอีเมล
        if args.dry_run:
            print("\n🚨 Skipped sending email because --dry-run is active")
        else:
            recipients = args.test_email if args.test_email else EMAIL_RECIPIENTS
            if not recipients:
                print("❌ Failed to send email: No recipients found (Please setup EMAIL_RECIPIENTS in .env)")
            else:
                subject = f"🔴 Alert: Low Oil Level (Level 1) - {len(alerts)} items require attention"
                html_body = build_email_html(alerts)
                
                print(f"📨 Sending notification email to: {recipients}")
                send_email(recipients, subject, html_body)
                
        conn.close()
        print("\n" + "=" * 60)
        print("✅ การทำงานเสร็จสมบูรณ์")
        print("=" * 60)

    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาด: {e}")
        raise

if __name__ == "__main__":
    main()
