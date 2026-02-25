import PDFDocument from "pdfkit";
import type { Quotation, QuoteItem, Organization } from "@shared/schema";
import fs from "fs";
import path from "path";

export function generateInvoicePDF(
  org: Organization,
  quote: Quotation,
  items: QuoteItem[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const ml = 56;
    const mr = 56;
    const contentW = pageW - ml - mr;

    const brand = org.primaryColor || "#1d4ed8";
    const ink = "#1a1a1a";
    const secondary = "#4b5563";
    const muted = "#9ca3af";
    const line = "#e5e7eb";

    let y = 0;

    // ── HEADER ──────────────────────────────────────────────────────────
    y = 48;

    const logoMaxH = org.logoSize || 40;
    let logoRendered = false;
    if (org.logo) {
      try {
        const logoPath = path.join(process.cwd(), org.logo.replace(/^\//, ""));
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, ml, y, { height: logoMaxH });
          logoRendered = true;
        }
      } catch {}
    }
    if (!logoRendered) {
      doc.fontSize(18).font("Helvetica-Bold").fill(ink).text(org.name || "", ml, y);
    }

    doc
      .fontSize(24)
      .font("Helvetica")
      .fill(muted)
      .text("FACTUUR", 0, y, { align: "right", width: pageW - mr });

    y += Math.max(logoMaxH, 28) + 24;

    doc
      .moveTo(ml, y)
      .lineTo(pageW - mr, y)
      .strokeColor(brand)
      .lineWidth(1.5)
      .stroke();

    y += 28;

    // ── INVOICE META ────────────────────────────────────────────────────
    const dueDate = new Date(quote.createdAt || new Date());
    dueDate.setDate(dueDate.getDate() + 14);

    const metaLeft = [
      { label: "Factuurnummer", value: quote.invoiceNumber || `INV-${quote.id}` },
      { label: "Factuurdatum", value: formatDate(quote.createdAt) },
      { label: "Vervaldatum", value: formatDate(dueDate) },
    ];

    metaLeft.forEach((item) => {
      doc.fontSize(8).font("Helvetica").fill(muted).text(item.label, ml, y);
      doc.fontSize(10).font("Helvetica-Bold").fill(ink).text(item.value, ml + 100, y);
      y += 18;
    });

    y += 16;

    // ── ADDRESS BLOCKS ──────────────────────────────────────────────────
    const colW = (contentW - 40) / 2;
    const rightCol = ml + colW + 40;
    const addrStartY = y;

    doc.fontSize(8).font("Helvetica-Bold").fill(brand).text("FACTUUR AAN", ml, y);
    y += 16;
    doc.fontSize(11).font("Helvetica-Bold").fill(ink).text(quote.clientName, ml, y);
    y += 16;
    doc.fontSize(9).font("Helvetica").fill(secondary);
    if (quote.clientCompany) {
      doc.text(quote.clientCompany, ml, y, { width: colW });
      y += 14;
    }
    if (quote.clientEmail) {
      doc.text(quote.clientEmail, ml, y, { width: colW });
      y += 14;
    }
    if (quote.clientPhone) {
      doc.text(quote.clientPhone, ml, y, { width: colW });
      y += 14;
    }
    if (quote.clientAddress) {
      doc.text(quote.clientAddress, ml, y, { width: colW });
      y += 14;
    }

    let orgY = addrStartY;
    doc.fontSize(8).font("Helvetica-Bold").fill(brand).text("VAN", rightCol, orgY);
    orgY += 16;
    doc.fontSize(11).font("Helvetica-Bold").fill(ink).text(org.name || "", rightCol, orgY);
    orgY += 16;
    doc.fontSize(9).font("Helvetica").fill(secondary);
    if (org.address) {
      doc.text(org.address, rightCol, orgY, { width: colW });
      orgY += 14;
    }
    if (org.email) {
      doc.text(org.email, rightCol, orgY, { width: colW });
      orgY += 14;
    }
    if (org.phone) {
      doc.text(org.phone, rightCol, orgY, { width: colW });
      orgY += 14;
    }
    if (org.vatNumber) {
      doc.text(`BTW: ${org.vatNumber}`, rightCol, orgY, { width: colW });
      orgY += 14;
    }
    if (org.kvkNumber) {
      doc.text(`KVK: ${org.kvkNumber}`, rightCol, orgY, { width: colW });
      orgY += 14;
    }

    y = Math.max(y, orgY) + 32;

    // ── ITEMS TABLE ─────────────────────────────────────────────────────
    const COL = {
      desc: ml,
      qty: ml + contentW * 0.55,
      price: ml + contentW * 0.70,
      total: ml + contentW * 0.85,
      end: pageW - mr,
    };
    const qtyW = COL.price - COL.qty;
    const priceW = COL.total - COL.price;
    const totalW = COL.end - COL.total;
    const descW = COL.qty - COL.desc - 8;

    doc
      .rect(ml, y, contentW, 26)
      .fill("#f9fafb");

    doc.fontSize(7.5).font("Helvetica-Bold").fill(secondary);
    doc.text("OMSCHRIJVING", COL.desc + 8, y + 9);
    doc.text("AANTAL", COL.qty, y + 9, { width: qtyW, align: "center" });
    doc.text("PRIJS", COL.price, y + 9, { width: priceW, align: "right" });
    doc.text("TOTAAL", COL.total, y + 9, { width: totalW, align: "right" });

    y += 26;

    doc
      .moveTo(ml, y)
      .lineTo(pageW - mr, y)
      .strokeColor(line)
      .lineWidth(0.5)
      .stroke();

    const selectedItems = items.filter((i) => i.isSelected);
    selectedItems.forEach((item) => {
      const hasDesc = !!item.description;
      const rowH = hasDesc ? 42 : 30;

      if (y + rowH > 720) {
        doc.addPage();
        y = 56;
      }

      const cellY = y + (hasDesc ? 8 : 10);

      doc
        .fontSize(9.5)
        .font("Helvetica-Bold")
        .fill(ink)
        .text(item.name, COL.desc + 8, cellY, { width: descW });

      if (hasDesc) {
        doc
          .fontSize(8)
          .font("Helvetica")
          .fill(muted)
          .text(item.description!, COL.desc + 8, cellY + 14, { width: descW });
      }

      const numY = y + (hasDesc ? 14 : 10);
      doc.fontSize(9).font("Helvetica").fill(secondary);
      doc.text(String(item.quantity), COL.qty, numY, { width: qtyW, align: "center" });
      doc.text(formatEUR(parseFloat(item.unitPrice)), COL.price, numY, { width: priceW, align: "right" });
      doc.font("Helvetica-Bold").fill(ink);
      doc.text(formatEUR(parseFloat(item.total || "0")), COL.total, numY, { width: totalW, align: "right" });

      y += rowH;

      doc
        .moveTo(ml, y)
        .lineTo(pageW - mr, y)
        .strokeColor(line)
        .lineWidth(0.25)
        .stroke();
    });

    // ── TOTALS ──────────────────────────────────────────────────────────
    y += 16;
    const totLabelX = COL.price;
    const totLabelW = COL.total - COL.price - 8;
    const totValW = totalW;

    const drawRow = (label: string, value: string, bold = false, accent = false) => {
      doc
        .fontSize(bold ? 11 : 9)
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fill(bold ? ink : secondary)
        .text(label, totLabelX, y, { width: totLabelW, align: "left" });
      doc
        .fontSize(bold ? 11 : 9)
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fill(accent ? brand : (bold ? ink : secondary))
        .text(value, COL.total, y, { width: totValW, align: "right" });
      y += bold ? 24 : 18;
    };

    drawRow("Subtotaal", formatEUR(parseFloat(quote.subtotal || "0")));

    if (parseFloat(quote.discount || "0") > 0) {
      drawRow("Korting", `-${formatEUR(parseFloat(quote.discount || "0"))}`);
    }

    if (quote.includeVat) {
      drawRow(`BTW (${quote.vatRate}%)`, formatEUR(parseFloat(quote.vatAmount || "0")));
    }

    doc
      .moveTo(totLabelX, y - 4)
      .lineTo(pageW - mr, y - 4)
      .strokeColor(ink)
      .lineWidth(0.75)
      .stroke();

    y += 6;
    drawRow("TOTAAL", formatEUR(parseFloat(quote.total || "0")), true, true);

    // ── PAYMENT INFO ────────────────────────────────────────────────────
    if (org.iban) {
      y += 24;

      doc
        .rect(ml, y, contentW, 60)
        .fill("#f9fafb");

      doc
        .moveTo(ml, y)
        .lineTo(ml, y + 60)
        .strokeColor(brand)
        .lineWidth(3)
        .stroke();

      doc.fontSize(7.5).font("Helvetica-Bold").fill(brand).text("BETAALINFORMATIE", ml + 16, y + 10);

      doc.fontSize(9).font("Helvetica").fill(ink);
      doc.text(`IBAN: ${org.iban}`, ml + 16, y + 26);
      doc.text(`T.n.v.: ${org.name}`, ml + 240, y + 26);

      doc.fontSize(8.5).font("Helvetica").fill(secondary);
      doc.text(
        `Gelieve te betalen binnen 14 dagen o.v.v. ${quote.invoiceNumber || `INV-${quote.id}`}`,
        ml + 16,
        y + 42,
        { width: contentW - 32 },
      );

      y += 72;
    }

    // ── NOTES ───────────────────────────────────────────────────────────
    const notesText = quote.invoiceNotes || quote.notes;
    if (notesText) {
      y += 12;
      doc.fontSize(8).font("Helvetica-Bold").fill(secondary).text("Opmerkingen", ml, y);
      y += 14;
      doc
        .fontSize(8.5)
        .font("Helvetica")
        .fill(muted)
        .text(notesText, ml, y, { width: contentW });
    }

    // ── FOOTER ──────────────────────────────────────────────────────────
    const footerY = pageH - 48;

    doc
      .moveTo(ml, footerY - 16)
      .lineTo(pageW - mr, footerY - 16)
      .strokeColor(line)
      .lineWidth(0.5)
      .stroke();

    const footerParts = [
      org.website,
      org.email,
      org.phone,
      org.kvkNumber ? `KVK ${org.kvkNumber}` : null,
      org.vatNumber ? `BTW ${org.vatNumber}` : null,
    ]
      .filter(Boolean)
      .join("  \u00B7  ");

    doc
      .fontSize(7)
      .font("Helvetica")
      .fill(muted)
      .text(footerParts, ml, footerY - 4, { align: "center", width: contentW });

    doc.end();
  });
}

function formatEUR(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(isNaN(amount) ? 0 : amount);
}

function formatDate(date: Date | string | undefined | null): string {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
