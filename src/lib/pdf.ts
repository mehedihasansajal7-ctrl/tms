import PDFDocument from "pdfkit";

// Render a simple, readable table PDF (no external fonts needed).
export async function renderTablePdf(title: string, rows: Record<string, unknown>[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 36, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = 36;
    const pageWidth = doc.page.width - 72;

    doc.font("Helvetica-Bold").fontSize(16).fillColor("#0f172a").text(title);
    doc.moveDown(0.4);
    doc.font("Helvetica").fontSize(9).fillColor("#475569").text(`Generated ${new Date().toLocaleString()}`);
    doc.moveDown(0.6);

    if (rows.length === 0) {
      doc.fontSize(11).fillColor("#0f172a").text("No data for this report.");
      doc.end();
      return;
    }

    const cols = Object.keys(rows[0]).slice(0, 6);
    const colWidth = pageWidth / cols.length;
    let y = doc.y;

    const drawRow = (row: Record<string, unknown>, bold = false) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8).fillColor(bold ? "#0f172a" : "#334155");
      cols.forEach((c, i) => {
        const text = bold ? c : String(row[c] ?? "");
        doc.text(text, left + i * colWidth, y, { width: colWidth - 4, height: 14, ellipsis: true, lineBreak: false });
      });
      doc
        .moveTo(left, y + 13)
        .lineTo(left + pageWidth, y + 13)
        .strokeColor("#e2e8f0")
        .lineWidth(0.5)
        .stroke();
      y += 16;
    };

    drawRow(Object.fromEntries(cols.map((c) => [c, c])), true);

    for (const row of rows) {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 36;
        drawRow(Object.fromEntries(cols.map((c) => [c, c])), true);
      }
      drawRow(row);
    }

    doc.end();
  });
}
