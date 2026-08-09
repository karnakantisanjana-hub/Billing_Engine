import io
from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from app.models import Invoice

GOLD = HexColor("#C5A059")
GOLD_SOFT = HexColor("#D4B76A")
GOLD_LIGHT = HexColor("#F5ECD8")
CREAM_BG = HexColor("#FDFBF7")
WHITE = HexColor("#FFFFFF")
TEXT_PRIMARY = HexColor("#2B2420")
TEXT_SECONDARY = HexColor("#6B7280")
TEXT_LIGHT = HexColor("#9CA3AF")
BORDER = HexColor("#E8E0D0")
BORDER_LIGHT = HexColor("#F0E6D2")
STATUS_PAID = HexColor("#059669")
STATUS_UNPAID = HexColor("#D97706")
STATUS_FAILED = HexColor("#DC2626")
STATUS_REFUNDED = HexColor("#7C3AED")
DIVIDER = HexColor("#E5DDD0")

GST_RATE = 0.18


def generate_pdf_invoice_stream(invoice: Invoice) -> io.BytesIO:
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    w, h = letter

    p.setFillColor(CREAM_BG)
    p.rect(0, 0, w, h, fill=1, stroke=0)

    p.setFillColor(GOLD_LIGHT)
    p.rect(0, h - 90, w, 90, fill=1, stroke=0)

    p.setStrokeColor(GOLD_SOFT)
    p.setLineWidth(2)
    p.line(0, h - 90, w, h - 90)
    p.setFillColor(GOLD)
    p.setFont("Helvetica-Bold", 22)
    p.drawString(45, h - 55, "Billing Engine")

    p.setFillColor(TEXT_SECONDARY)
    p.setFont("Helvetica", 10)
    p.drawString(45, h - 72, "Premium Subscription Billing")

    p.setFillColor(TEXT_SECONDARY)
    p.setFont("Helvetica", 9)
    p.drawRightString(w - 45, h - 50, "123 Main Avenue, Tech Suite, CA")
    p.drawRightString(w - 45, h - 64, "contact@billingengine.com")

    card_y = h - 190
    p.setFillColor(WHITE)
    p.roundRect(35, card_y, w - 70, 80, 10, fill=1, stroke=0)
    p.setStrokeColor(BORDER_LIGHT)
    p.setLineWidth(0.5)
    p.roundRect(35, card_y, w - 70, 80, 10, fill=0, stroke=1)
    p.setFillColor(TEXT_PRIMARY)
    p.setFont("Helvetica-Bold", 14)
    p.drawString(55, card_y + 50, f"Invoice  {invoice.invoice_number}")

    p.setFillColor(TEXT_SECONDARY)
    p.setFont("Helvetica", 10)
    p.drawString(55, card_y + 30, f"Issued: {invoice.invoice_date or 'N/A'}")
    p.drawString(55, card_y + 14, f"Due: {invoice.due_date or 'N/A'}")

    status = (invoice.status or "draft").upper()
    status_colors = {
        "PAID": STATUS_PAID,
        "UNPAID": STATUS_UNPAID,
        "FAILED": STATUS_FAILED,
        "REFUNDED": STATUS_REFUNDED,
        "DRAFT": TEXT_LIGHT,
    }
    badge_color = status_colors.get(status, TEXT_LIGHT)

    p.setFillColor(badge_color)
    p.roundRect(w - 185, card_y + 40, 100, 26, 6, fill=1, stroke=0)
    p.setFillColor(WHITE)
    p.setFont("Helvetica-Bold", 10)
    p.drawCentredString(w - 135, card_y + 45, status)

    bt_y = card_y - 100
    p.setFillColor(WHITE)
    p.roundRect(35, bt_y, 260, 85, 10, fill=1, stroke=0)
    p.setStrokeColor(BORDER_LIGHT)
    p.setLineWidth(0.5)
    p.roundRect(35, bt_y, 260, 85, 10, fill=0, stroke=1)

    p.setFillColor(GOLD)
    p.setFont("Helvetica-Bold", 9)
    p.drawString(50, bt_y + 68, "BILL TO")

    customer_name = invoice.customer.name if invoice.customer else "Unknown"
    p.setFillColor(TEXT_PRIMARY)
    p.setFont("Helvetica-Bold", 12)
    p.drawString(50, bt_y + 48, customer_name)

    p.setFillColor(TEXT_SECONDARY)
    p.setFont("Helvetica", 9)
    company = invoice.customer.company_name if invoice.customer else "N/A"
    p.drawString(50, bt_y + 30, company)
    customer_email = invoice.customer.email if invoice.customer else "N/A"
    p.drawString(50, bt_y + 16, customer_email)

    # ─── PAYMENT INFO ───
    p.setFillColor(WHITE)
    p.roundRect(315, bt_y, 262, 85, 10, fill=1, stroke=0)
    p.setStrokeColor(BORDER_LIGHT)
    p.setLineWidth(0.5)
    p.roundRect(315, bt_y, 262, 85, 10, fill=0, stroke=1)

    p.setFillColor(GOLD)
    p.setFont("Helvetica-Bold", 9)
    p.drawString(330, bt_y + 68, "PAYMENT INFO")

    p.setFillColor(TEXT_SECONDARY)
    p.setFont("Helvetica", 9)
    p.drawString(330, bt_y + 48, f"Payment Method: {invoice.payments[0].payment_method if invoice.payments else 'N/A'}")
    if invoice.payments:
        ref = invoice.payments[0].payment_reference or "N/A"
        p.drawString(330, bt_y + 30, f"Reference: {ref}")

    # ─── CALCULATE GST ───
    subtotal = invoice.subtotal or 0.0
    gst_amount = round(subtotal * GST_RATE, 2)
    total_amount = round(subtotal + gst_amount, 2)

    table_top = bt_y - 20

    p.setFillColor(GOLD_LIGHT)
    p.roundRect(35, table_top - 32, w - 70, 30, 6, fill=1, stroke=0)

    p.setFillColor(GOLD)
    p.setFont("Helvetica-Bold", 10)
    p.drawString(55, table_top - 17, "Description")
    p.drawCentredString(w / 2, table_top - 17, "Amount")
    p.drawRightString(w - 55, table_top - 17, "Total")

    row1_y = table_top - 58
    p.setFillColor(TEXT_PRIMARY)
    p.setFont("Helvetica", 11)
    p.drawString(55, row1_y, "Base Subscription Fee")
    p.drawCentredString(w / 2, row1_y, f"₹{subtotal:,.2f}")
    p.drawRightString(w - 55, row1_y, f"₹{subtotal:,.2f}")

    row2_y = row1_y - 24
    p.setFont("Helvetica", 11)
    p.drawString(55, row2_y, f"VAT / GST ({int(GST_RATE * 100)}%)")
    p.drawCentredString(w / 2, row2_y, f"₹{gst_amount:,.2f}")
    p.drawRightString(w - 55, row2_y, f"₹{gst_amount:,.2f}")
    p.setStrokeColor(DIVIDER)
    p.setLineWidth(0.75)
    p.line(45, row2_y - 14, w - 45, row2_y - 14)

    total_y = row2_y - 50
    p.setFillColor(GOLD_LIGHT)
    p.roundRect(315, total_y, 262, 36, 8, fill=1, stroke=0)

    p.setFillColor(GOLD)
    p.setFont("Helvetica-Bold", 12)
    p.drawString(330, total_y + 12, "Total Amount")
    p.drawRightString(w - 55, total_y + 12, f"₹{total_amount:,.2f}")

    p.setFillColor(GOLD_LIGHT)
    p.rect(0, 0, w, 45, fill=1, stroke=0)

    p.setFillColor(TEXT_SECONDARY)
    p.setFont("Helvetica", 8)
    p.drawCentredString(w / 2, 25, "Thank you for your business")
    p.drawCentredString(w / 2, 12, "support@billingengine.com  •  www.billingengine.com")

    p.setStrokeColor(GOLD_SOFT)
    p.setLineWidth(1.5)
    p.line(45, card_y - 8, w - 45, card_y - 8)

    p.setStrokeColor(DIVIDER)
    p.setLineWidth(0.5)
    p.line(45, total_y - 10, w - 45, total_y - 10)

    p.showPage()
    p.save()

    buffer.seek(0)
    return buffer
