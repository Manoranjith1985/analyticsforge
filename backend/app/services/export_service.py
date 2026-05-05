"""
Export Service — PDF and Excel report generation.
"""
import io
import pandas as pd
from typing import List, Dict, Any, Optional
from datetime import datetime


class ExportService:

    @staticmethod
    def to_excel(data: Dict[str, Any], sheet_name: str = "Report") -> bytes:
        df = pd.DataFrame(data["rows"], columns=data["columns"])
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name=sheet_name, index=False)
            # Auto-size columns
            ws = writer.sheets[sheet_name]
            for col in ws.columns:
                max_len = max(len(str(cell.value or "")) for cell in col) + 2
                ws.column_dimensions[col[0].column_letter].width = min(max_len, 50)
        return buf.getvalue()

    @staticmethod
    def to_csv(data: Dict[str, Any]) -> bytes:
        df = pd.DataFrame(data["rows"], columns=data["columns"])
        return df.to_csv(index=False).encode("utf-8")

    @staticmethod
    def to_pdf(
        title: str,
        data: Dict[str, Any],
        description: Optional[str] = None,
    ) -> bytes:
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            SimpleDocTemplate, Table, TableStyle, Paragraph,
            Spacer, HRFlowable
        )
        from reportlab.lib.enums import TA_CENTER, TA_LEFT

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=landscape(A4),
            rightMargin=1.5 * cm,
            leftMargin=1.5 * cm,
            topMargin=2 * cm,
            bottomMargin=2 * cm,
        )

        styles = getSampleStyleSheet()
        PRIMARY = colors.HexColor("#4f46e5")
        LIGHT_GRAY = colors.HexColor("#f8fafc")
        MID_GRAY = colors.HexColor("#e2e8f0")

        title_style = ParagraphStyle("Title", parent=styles["Title"], textColor=PRIMARY, fontSize=18, spaceAfter=6)
        sub_style = ParagraphStyle("Sub", parent=styles["Normal"], textColor=colors.gray, fontSize=10)
        meta_style = ParagraphStyle("Meta", parent=styles["Normal"], textColor=colors.gray, fontSize=8)

        story = []
        story.append(Paragraph(title, title_style))
        if description:
            story.append(Paragraph(description, sub_style))
        story.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", meta_style))
        story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=12))

        columns = data.get("columns", [])
        rows = data.get("rows", [])

        if columns and rows:
            table_data = [columns] + [[str(v)[:60] if v is not None else "" for v in row] for row in rows[:500]]
            col_width = (landscape(A4)[0] - 3 * cm) / max(len(columns), 1)
            col_widths = [col_width] * len(columns)

            table = Table(table_data, colWidths=col_widths, repeatRows=1)
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.3, MID_GRAY),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            story.append(table)
            story.append(Spacer(1, 0.5 * cm))
            story.append(Paragraph(f"Total rows: {data.get('row_count', len(rows))}", meta_style))

        doc.build(story)
        return buf.getvalue()
