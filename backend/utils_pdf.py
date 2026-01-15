import os
import math
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm, cm
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle
from datetime import datetime, timedelta
import io

# --- LAYOUT CONFIGURATION ---
PAGE_WIDTH, PAGE_HEIGHT = landscape(A4)
MARGIN_X = 10 * mm
MARGIN_Y = 10 * mm

# Vertical Areas
HEADER_HEIGHT = 45 * mm 
FOOTER_HEIGHT = 15 * mm
CONTENT_HEIGHT = PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT - (2 * MARGIN_Y)

# Table Settings
ROW_HEIGHT = 8 * mm
HEADER_ROW_HEIGHT = 10 * mm
ROWS_PER_PAGE = int((CONTENT_HEIGHT - HEADER_ROW_HEIGHT) / ROW_HEIGHT) - 1 # Safety buffer

LOGO_PATH = os.path.join(os.path.dirname(__file__), "assets", "logo.png")

# --- COLOR PALETTE (Premium) ---
COLOR_PRIMARY = colors.Color(15/255, 23/255, 42/255) # Slate 900
COLOR_ACCENT = colors.Color(16/255, 185/255, 129/255) # Emerald 500
COLOR_HEADER_BG = colors.Color(30/255, 41/255, 59/255) # Slate 800
COLOR_TEXT_HEADER = colors.white
COLOR_ROW_ODD = colors.white
COLOR_ROW_EVEN = colors.Color(241/255, 245/255, 249/255) # Slate 100
COLOR_BORDER = colors.Color(203/255, 213/255, 225/255) # Slate 300

# Shift Colors
COLOR_SHIFT_M = colors.Color(254/255, 243/255, 199/255) # Amber 100
COLOR_SHIFT_P = colors.Color(224/255, 242/255, 254/255) # Sky 100
COLOR_SHIFT_N = colors.Color(30/255, 41/255, 59/255) # Slate 800 (Text will be white)
COLOR_OFF = colors.Color(243/255, 244/255, 246/255) # Gray 100
COLOR_HOLIDAY = colors.Color(254/255, 226/255, 226/255) # Red 100

def get_italian_holidays(year):
    """Restituisce dizionario data -> nome festività."""
    holidays = {
        datetime(year, 1, 1).date(): "CAPODANNO",
        datetime(year, 1, 6).date(): "EPIFANIA",
        datetime(year, 4, 25).date(): "LIBERAZIONE",
        datetime(year, 5, 1).date(): "LAVORATORI",
        datetime(year, 6, 2).date(): "REPUBBLICA",
        datetime(year, 8, 15).date(): "FERRAGOSTO",
        datetime(year, 11, 1).date(): "OGNISSANTI",
        datetime(year, 12, 8).date(): "IMMACOLATA",
        datetime(year, 12, 25).date(): "NATALE",
        datetime(year, 12, 26).date(): "S. STEFANO"
    }
    
    # Pasqua
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    easter = datetime(year, month, day).date()
    monday_easter = easter + timedelta(days=1)
    
    holidays[easter] = "PASQUA"
    holidays[monday_easter] = "LUNEDI ANGELO"
    
    return holidays


import traceback

def generate_shift_pdf(
    department_name: str,
    start_date: datetime,
    end_date: datetime,
    employees_data: list,
    alerts: list = []
):
    try:
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=landscape(A4))
        c.setTitle(f"Turnazione {start_date.strftime('%d-%m-%Y')}")

        # Chunking logic for Pagination
        total_emps = len(employees_data)
        
        # If no employees, just print one empty page
        if total_emps == 0:
            draw_page(c, department_name, start_date, end_date, [], alerts, 1, 1)
            c.save()
            buffer.seek(0)
            return buffer

        # Calculate chunks
        # ROWS_PER_PAGE calculated above based on content height
        chunks = [employees_data[i:i + ROWS_PER_PAGE] for i in range(0, total_emps, ROWS_PER_PAGE)]
        total_pages = len(chunks)

        for i, chunk in enumerate(chunks):
            page_num = i + 1
            draw_page(c, department_name, start_date, end_date, chunk, alerts, page_num, total_pages)
            c.showPage()

        c.save()
        buffer.seek(0)
        return buffer
    except Exception as e:
        print("❌ ERROR GENERATING PDF:")
        traceback.print_exc()
        raise e


def draw_page(c, department_name, start_date, end_date, employees_chunk, alerts, page_num, total_pages):
    """Draws a single page with Header, Table Chunk, and Footer."""
    
    # --- 1. HEADER ---
    # Background Top Bar
    c.setFillColor(COLOR_PRIMARY)
    c.rect(0, PAGE_HEIGHT - 15*mm, PAGE_WIDTH, 15*mm, stroke=0, fill=1)
    
    # Logo
    if os.path.exists(LOGO_PATH):
        # White Logo area or just draw over dark bg? 
        # Assuming logo is suitable for dark or we draw a white circle/box
        # c.setFillColor(colors.white)
        # c.circle(MARGIN_X + 10*mm, PAGE_HEIGHT - 7.5*mm, 10*mm, stroke=0, fill=1)
        c.drawImage(LOGO_PATH, MARGIN_X, PAGE_HEIGHT - 13*mm, width=12*mm, height=12*mm, mask='auto', preserveAspectRatio=True)
    
    # App Name
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(colors.white)
    c.drawString(MARGIN_X + 15*mm, PAGE_HEIGHT - 10*mm, "SL ENTERPRISE")

    # Page Number
    c.setFont("Helvetica", 9)
    c.drawRightString(PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 10*mm, f"Pagina {page_num}/{total_pages}")

    # Main Title Area (Below top bar)
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(MARGIN_X, PAGE_HEIGHT - 30*mm, "FOGLIO TURNAZIONE")
    
    # Dept & Date Box (Right aligned)
    c.setFont("Helvetica-Bold", 12)
    c.drawRightString(PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 28*mm, f"REPARTO: {department_name.upper()}")
    
    c.setFont("Helvetica", 11)
    date_range = f"{start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')}"
    c.drawRightString(PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 34*mm, f"SETTIMANA: {date_range}")

    # Alerts Strip
    c.setFillColor(colors.Color(255/255, 247/255, 237/255)) # Orange 50
    c.setStrokeColor(colors.Color(253/255, 186/255, 116/255)) # Orange 300
    c.roundRect(MARGIN_X, PAGE_HEIGHT - MARGIN_Y - 35*mm, PAGE_WIDTH - 2*MARGIN_X, 8*mm, 2*mm, fill=1, stroke=1)
    
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(MARGIN_X + 3*mm, PAGE_HEIGHT - MARGIN_Y - 31*mm, "NOTE / AVVISI:")
    
    c.setFont("Helvetica", 9)
    if not alerts:
        c.drawString(MARGIN_X + 35*mm, PAGE_HEIGHT - MARGIN_Y - 31*mm, "Nessuna segnalazione.")
    else:
        alert_text = "  •  ".join(alerts)
        if len(alert_text) > 140: alert_text = alert_text[:137] + "..."
        c.drawString(MARGIN_X + 35*mm, PAGE_HEIGHT - MARGIN_Y - 31*mm, alert_text)

    # --- 2. TABLE ---
    if employees_chunk:
        draw_table(c, employees_chunk, start_date)
    else:
        c.drawCentredString(PAGE_WIDTH/2, PAGE_HEIGHT/2, "Nessun dato da visualizzare.")

    # --- 3. FOOTER ---
    c.setStrokeColor(COLOR_PRIMARY)
    c.setLineWidth(0.5)
    c.line(MARGIN_X, MARGIN_Y + 8*mm, PAGE_WIDTH - MARGIN_X, MARGIN_Y + 8*mm)
    
    c.setFont("Helvetica-Oblique", 8)
    c.setFillColor(colors.grey)
    c.drawCentredString(PAGE_WIDTH / 2, MARGIN_Y, "Generato da SL ENTERPRISE SOLUTIONS - Documento Riservato")


def draw_table(c, employees_data, start_date):
    # Header Setup
    days_header = ["DIPENDENTE", "BANCHINA"]
    current = start_date
    holidays_indices = []
    
    # Pre-calc holidays for coloring
    years = {start_date.year, (start_date + timedelta(days=6)).year}
    holidays_map = {}
    for y in years: holidays_map.update(get_italian_holidays(y))

    for i in range(7):
        day_date = current.date()
        day_str = current.strftime("%a %d").upper()
        if day_date in holidays_map or day_date.weekday() == 6:
            holidays_indices.append(i + 2) # Offset 2 cols
        days_header.append(day_str)
        current += timedelta(days=1)

    # Data Construction
    data = [days_header]
    row_styles = [] # (row_idx, col_idx, bg_color, text_color)

    for row_idx, emp in enumerate(employees_data):
        banchina_val = emp.get('banchina', '-')
        row = [emp['name'], banchina_val]
        
        for col_idx, shift in enumerate(emp['shifts']):
            cell_val = shift
            actual_col = col_idx + 2
            
            # Logic for Cell Styling
            bg_color = None
            text_color = colors.black
            
            s_u = shift.upper()
            
            if "NOTTE" in s_u or "22-06" in s_u:
                bg_color = COLOR_SHIFT_N
                text_color = colors.white
            elif "14-22" in s_u:
                bg_color = COLOR_SHIFT_P
            elif "06-14" in s_u:
                bg_color = COLOR_SHIFT_M
            elif "RIPOSO" in s_u:
                bg_color = COLOR_OFF
                text_color = colors.grey
            elif "FERIE" in s_u:
                bg_color = colors.orange
                text_color = colors.white
            elif "MALATTIA" in s_u:
                bg_color = colors.pink
            elif "PERMESSO" in s_u:
                bg_color = colors.yellow
            
            if bg_color:
                row_styles.append((row_idx + 1, actual_col, bg_color, text_color))
                
            row.append(cell_val)
        data.append(row)

    # Column Widths
    total_w = PAGE_WIDTH - (2 * MARGIN_X)
    col_w_name = 55 * mm
    col_w_ban = 20 * mm
    col_w_day = (total_w - col_w_name - col_w_ban) / 7
    
    col_widths = [col_w_name, col_w_ban] + [col_w_day] * 7

    t = Table(data, colWidths=col_widths, rowHeights=ROW_HEIGHT)
    
    # Base Style
    base_style = [
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('TEXTCOLOR', (0,0), (-1,0), COLOR_TEXT_HEADER),
        ('BACKGROUND', (0,0), (-1,0), COLOR_HEADER_BG),
        
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        
        # Name Col Alignment
        ('ALIGN', (0,1), (0,-1), 'LEFT'),
        ('LEFTPADDING', (0,1), (0,-1), 6),
        ('FONTNAME', (0,1), (0,-1), 'Helvetica-Bold'),
        
        # Grid
        ('GRID', (0,0), (-1,-1), 0.5, COLOR_BORDER),
    ]

    # Zebra Striping
    for i in range(1, len(data)):
        bg = COLOR_ROW_ODD if i % 2 != 0 else COLOR_ROW_EVEN
        base_style.append(('BACKGROUND', (0, i), (-1, i), bg))

    # Holiday Columns (Light Red tint)
    for h_idx in holidays_indices:
        # Apply only to data rows, not header (header is dark)
        # Actually header is set to Dark, so if we apply background to (h_idx, 0), it might override
        # Let's apply to (h_idx, 1) onwards
        base_style.append(('BACKGROUND', (h_idx, 1), (h_idx, -1), COLOR_HOLIDAY))
        
    # Specific Cell Styles (Overrides holidays/zebra)
    # Fixed variable shadowing bug (c -> col_idx)
    for r, col_idx, bg, txt in row_styles:
        base_style.append(('BACKGROUND', (col_idx, r), (col_idx, r), bg))
        base_style.append(('TEXTCOLOR', (col_idx, r), (col_idx, r), txt))

    t.setStyle(TableStyle(base_style))
    
    # Draw it
    # Calculate Y position
    # The header area takes up HEADER_HEIGHT. 
    # We draw the table starting below that.
    table_y_start = PAGE_HEIGHT - HEADER_HEIGHT
    
    # wrapOn isn't strictly needed if we know size, but good practice
    w, h = t.wrap(total_w, PAGE_HEIGHT) 
    t.drawOn(c, MARGIN_X, table_y_start - h)
