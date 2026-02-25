import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth } from "./auth";
import { randomBytes, createHash } from "crypto";
import { generateInvoicePDF } from "./pdf-generator";
import { sendEmail, sendEmailWithCopy, buildQuoteEmailHtml, buildInvoiceEmailHtml, buildNewLeadNotificationHtml, buildPortalAccessEmailHtml, buildDossierMessageEmailHtml, buildEmployeeInviteEmailHtml } from "./email-sender";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo-${Date.now()}${ext}`);
  },
});
const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".png", ".jpg", ".jpeg", ".svg", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Alleen afbeeldingen zijn toegestaan"));
  },
});

const dossierStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `dossier-${Date.now()}-${randomBytes(4).toString("hex")}${ext}`);
  },
});
const uploadDossierFile = multer({
  storage: dossierStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function generatePassword(): string {
  return randomBytes(4).toString("hex");
}

function getBaseUrl(req: any): string {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const user = req.user as any;
  if (!user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

function requireOwner(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const user = req.user as any;
  if (user.role === "medewerker") {
    return res.status(403).json({ message: "Alleen de eigenaar heeft toegang" });
  }
  next();
}

async function requireActiveSubscription(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return next();
  const user = req.user as any;
  if (user.isAdmin) return next();
  if (!user.organizationId) return next();

  const org = await storage.getOrganization(user.organizationId);
  if (!org) return next();

  if (org.subscriptionStatus === "active") return next();

  if (org.subscriptionStatus === "trial" && org.trialEndsAt) {
    if (new Date(org.trialEndsAt) > new Date()) return next();
    await storage.updateOrganization(org.id, { subscriptionStatus: "expired" });
    return res.status(403).json({ message: "trial_expired", trialEndsAt: org.trialEndsAt });
  }

  if (org.subscriptionStatus === "expired") {
    return res.status(403).json({ message: "trial_expired", trialEndsAt: org.trialEndsAt });
  }

  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  app.get("/api/subscription", requireAuth, async (req, res) => {
    const user = req.user as any;
    const org = await storage.getOrganization(user.organizationId);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    const employees = await storage.getEmployeesByOrg(user.organizationId);
    const maxEmp = org.maxEmployees || 3;
    const planName = maxEmp >= 999 ? "enterprise" : maxEmp > 3 ? "pro" : "starter";
    res.json({
      status: org.subscriptionStatus,
      trialEndsAt: org.trialEndsAt,
      employeeCount: employees.length,
      maxEmployees: maxEmp,
      plan: planName,
    });
  });

  app.post("/api/subscription/activate", requireAuth, requireOwner, async (req, res) => {
    const user = req.user as any;
    const plan = req.body.plan || "starter";
    const maxEmployees = plan === "pro" ? 10 : plan === "enterprise" ? 999 : 3;
    await storage.updateOrganization(user.organizationId, {
      subscriptionStatus: "active",
      maxEmployees,
    });
    res.json({ success: true, plan, maxEmployees });
  });

  app.get("/api/organization", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (!user.organizationId) return res.status(404).json({ message: "No organization" });
    const org = await storage.getOrganization(user.organizationId);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    res.json(org);
  });

  app.patch("/api/organization", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (!user.organizationId) return res.status(404).json({ message: "No organization" });
    const data = { ...req.body };
    if (data.name && !data.slug) {
      data.slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        + "-offerte-aanvragen";
    }
    const updated = await storage.updateOrganization(user.organizationId, data);
    res.json(updated);
  });

  app.post("/api/organization/logo", requireAuth, uploadLogo.single("logo"), async (req, res) => {
    const user = req.user as any;
    if (!user.organizationId) return res.status(404).json({ message: "No organization" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const logoUrl = `/uploads/${req.file.filename}`;
    const updated = await storage.updateOrganization(user.organizationId, { logo: logoUrl });
    res.json(updated);
  });

  app.use("/uploads", express.static(uploadsDir));

  app.get("/api/price-matrix", requireAuth, async (req, res) => {
    const user = req.user as any;
    const items = await storage.getPriceMatrixItems(user.organizationId);
    res.json(items);
  });

  app.post("/api/price-matrix", requireAuth, async (req, res) => {
    const user = req.user as any;
    const item = await storage.createPriceMatrixItem({
      ...req.body,
      organizationId: user.organizationId,
    });
    res.status(201).json(item);
  });

  app.patch("/api/price-matrix/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const updated = await storage.updatePriceMatrixItem(id, req.body);
    res.json(updated);
  });

  app.delete("/api/price-matrix/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deletePriceMatrixItem(id);
    res.json({ success: true });
  });

  app.get("/api/quotations", requireAuth, async (req, res) => {
    const user = req.user as any;
    let quotes = await storage.getQuotations(user.organizationId);
    if (user.role === "medewerker") {
      quotes = quotes.filter(q => q.assignedEmployeeId === user.id);
    }
    res.json(quotes);
  });

  app.get("/api/quotations/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const quote = await storage.getQuotation(id);
    if (!quote) return res.status(404).json({ message: "Quote not found" });
    res.json(quote);
  });

  app.get("/api/quotations/:id/items", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const items = await storage.getQuoteItems(id);
    res.json(items);
  });

  app.post("/api/quotations", requireAuth, async (req, res) => {
    const user = req.user as any;
    const token = randomBytes(32).toString("hex");
    const quote = await storage.createQuotation({
      ...req.body,
      organizationId: user.organizationId,
      token,
    });

    if (req.body.items && Array.isArray(req.body.items)) {
      for (const item of req.body.items) {
        await storage.createQuoteItem({
          ...item,
          quotationId: quote.id,
        });
      }
    }

    if (req.body.status === "quote_sent") {
      const org = await storage.getOrganization(user.organizationId);
      if (org) {
        const quoteLink = `${getBaseUrl(req)}/quote/${quote.token}`;
        const html = buildQuoteEmailHtml(
          org.name,
          quote.clientName,
          quoteLink,
          org.primaryColor || "#1d4ed8"
        );
        sendEmailWithCopy(org, quote.clientEmail, `Offerte van ${org.name}`, html).catch(console.error);
      }
    }

    res.status(201).json(quote);
  });

  app.patch("/api/quotations/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const updated = await storage.updateQuotation(id, req.body);
    res.json(updated);
  });

  app.post("/api/quotations/:id/items", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const item = await storage.createQuoteItem({
      ...req.body,
      quotationId: id,
    });
    res.status(201).json(item);
  });

  app.patch("/api/quote-items/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const updated = await storage.updateQuoteItem(id, req.body);
    res.json(updated);
  });

  app.delete("/api/quote-items/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteQuoteItem(id);
    res.json({ success: true });
  });

  app.post("/api/quotations/:id/send", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const user = req.user as any;
    const quote = await storage.getQuotation(id);
    if (!quote) return res.status(404).json({ message: "Quote not found" });

    const updated = await storage.updateQuotation(id, {
      status: "quote_sent",
      auditLog: [
        ...((quote.auditLog as any[]) || []),
        { action: "quote_sent", timestamp: new Date().toISOString() },
      ],
    });

    const org = await storage.getOrganization(user.organizationId);
    if (org) {
      const quoteLink = `${getBaseUrl(req)}/quote/${quote.token}`;
      const html = buildQuoteEmailHtml(
        org.name,
        quote.clientName,
        quoteLink,
        org.primaryColor || "#1d4ed8"
      );
      sendEmailWithCopy(org, quote.clientEmail, `Offerte van ${org.name}`, html).catch(console.error);
    }

    res.json(updated);
  });

  app.post("/api/quotations/:id/generate-invoice", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const user = req.user as any;
    const quote = await storage.getQuotation(id);
    if (!quote) return res.status(404).json({ message: "Quote not found" });

    const org = await storage.getOrganization(user.organizationId);
    if (!org) return res.status(404).json({ message: "Organization not found" });

    const { invoiceNotes } = req.body || {};
    const counter = (org.invoiceCounter || 1000) + 1;
    const invoiceNumber = `${org.invoicePrefix || "INV"}-${counter}`;

    await storage.updateOrganization(org.id, { invoiceCounter: counter });
    const updated = await storage.updateQuotation(id, {
      status: "invoiced",
      invoiceNumber,
      invoiceNotes: invoiceNotes || null,
      auditLog: [
        ...((quote.auditLog as any[]) || []),
        { action: "invoiced", timestamp: new Date().toISOString(), invoiceNumber },
      ],
    });

    res.json(updated);
  });

  app.get("/api/quotations/:id/invoice-pdf", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const user = req.user as any;
    const quote = await storage.getQuotation(id);
    if (!quote) return res.status(404).json({ message: "Quote not found" });

    const org = await storage.getOrganization(user.organizationId);
    if (!org) return res.status(404).json({ message: "Organization not found" });

    const items = await storage.getQuoteItems(id);
    const pdfBuffer = await generateInvoicePDF(org, quote, items);

    const filename = `${quote.invoiceNumber || `factuur-${quote.id}`}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  });

  app.post("/api/quotations/:id/send-invoice", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const user = req.user as any;
    const quote = await storage.getQuotation(id);
    if (!quote) return res.status(404).json({ message: "Quote not found" });

    const org = await storage.getOrganization(user.organizationId);
    if (!org) return res.status(404).json({ message: "Organization not found" });

    const items = await storage.getQuoteItems(id);
    const pdfBuffer = await generateInvoicePDF(org, quote, items);

    const formatEUR = (v: number) =>
      new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(v);

    const html = buildInvoiceEmailHtml(
      org.name,
      quote.clientName,
      quote.invoiceNumber || `INV-${quote.id}`,
      formatEUR(parseFloat(quote.total || "0")),
      org.primaryColor || "#1d4ed8"
    );

    const sent = await sendEmailWithCopy(org, quote.clientEmail, `Factuur ${quote.invoiceNumber || ""} van ${org.name}`, html, [
      { filename: `${quote.invoiceNumber || "factuur"}.pdf`, content: pdfBuffer },
    ]);

    if (sent) {
      await storage.updateQuotation(id, {
        auditLog: [
          ...((quote.auditLog as any[]) || []),
          { action: "invoice_sent", timestamp: new Date().toISOString() },
        ],
      });

      const baseUrl = getBaseUrl(req);
      const plainPassword = generatePassword();
      let clientUser = await storage.getClientUserByEmail(quote.clientEmail, user.organizationId);
      if (!clientUser) {
        const loginToken = randomBytes(32).toString("hex");
        clientUser = await storage.createClientUser({
          organizationId: user.organizationId,
          quotationId: quote.id,
          email: quote.clientEmail,
          password: hashPassword(plainPassword),
          name: quote.clientName,
          phone: quote.clientPhone || null,
          company: quote.clientCompany || null,
          loginToken,
        });

        const portalLink = `${baseUrl}/client/portal/${loginToken}`;
        const portalHtml = buildPortalAccessEmailHtml(
          org.name,
          quote.clientName,
          portalLink,
          quote.clientEmail,
          plainPassword,
          org.primaryColor || "#1d4ed8"
        );
        sendEmail(org, quote.clientEmail, `Uw klantenportaal bij ${org.name}`, portalHtml).catch(console.error);
      }

      let dossier = await storage.getDossierByQuotation(quote.id);
      if (!dossier) {
        dossier = await storage.createDossier({
          organizationId: user.organizationId,
          quotationId: quote.id,
          clientUserId: clientUser.id,
          title: `Dossier - ${quote.clientName} - ${quote.invoiceNumber || `#${quote.id}`}`,
          status: "open",
        });
      }

      const invoiceFileName = `invoice-${quote.invoiceNumber || quote.id}-${Date.now()}.pdf`;
      const invoicePath = path.join(uploadsDir, invoiceFileName);
      fs.writeFileSync(invoicePath, pdfBuffer);
      await storage.createDossierEntry({
        dossierId: dossier.id,
        type: "file",
        content: `Factuur ${quote.invoiceNumber || ""}`,
        filePath: `/uploads/${invoiceFileName}`,
        caption: `Factuur ${quote.invoiceNumber || ""} - ${new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(parseFloat(quote.total || "0"))}`,
        createdBy: "tenant",
      });
    }

    res.json({ success: true, emailSent: sent });
  });

  app.get("/api/public/quote/:token", async (req, res) => {
    const quote = await storage.getQuotationByToken(req.params.token);
    if (!quote) return res.status(404).json({ message: "Quote not found" });

    const org = await storage.getOrganization(quote.organizationId);
    const items = await storage.getQuoteItems(quote.id);

    if (quote.status === "new_lead" || quote.status === "quote_sent") {
      await storage.updateQuotation(quote.id, {
        status: "viewed",
        auditLog: [
          ...((quote.auditLog as any[]) || []),
          { action: "viewed", timestamp: new Date().toISOString(), ip: req.ip },
        ],
      });
    }

    res.json({
      quote: {
        ...quote,
        status: quote.status === "new_lead" || quote.status === "quote_sent" ? "viewed" : quote.status,
      },
      organization: org,
      items,
    });
  });

  app.post("/api/public/quote/:token/accept", async (req, res) => {
    const quote = await storage.getQuotationByToken(req.params.token);
    if (!quote) return res.status(404).json({ message: "Quote not found" });

    const { signature, selectedItems } = req.body;

    if (selectedItems && Array.isArray(selectedItems)) {
      for (const si of selectedItems) {
        await storage.updateQuoteItem(si.id, { isSelected: si.isSelected });
      }
    }

    const items = await storage.getQuoteItems(quote.id);
    const selectedItemsList = items.filter((i) => i.isSelected);
    const subtotal = selectedItemsList.reduce(
      (sum, i) => sum + parseFloat(i.total || "0"),
      0
    );
    const vatAmount = quote.includeVat
      ? subtotal * (parseFloat(quote.vatRate || "21") / 100)
      : 0;
    const total = subtotal + vatAmount - parseFloat(quote.discount || "0");

    const updated = await storage.updateQuotation(quote.id, {
      status: "approved",
      signature,
      signedAt: new Date(),
      subtotal: subtotal.toFixed(2),
      vatAmount: vatAmount.toFixed(2),
      total: total.toFixed(2),
      auditLog: [
        ...((quote.auditLog as any[]) || []),
        {
          action: "approved",
          timestamp: new Date().toISOString(),
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
      ],
    });

    if (quote.desiredStartDate) {
      const existingEvents = await storage.getCalendarEvents(quote.organizationId);
      const requestedEvent = existingEvents.find(
        (e) => e.quotationId === quote.id && e.type === "requested"
      );
      if (requestedEvent) {
        await storage.deleteCalendarEvent(requestedEvent.id);
      }
      await storage.createCalendarEvent({
        organizationId: quote.organizationId,
        date: quote.desiredStartDate,
        startTime: (quote as any).desiredStartTime || null,
        type: "booked",
        title: `Geboekt: ${quote.clientName}`,
        notes: `Offerte #${quote.id} goedgekeurd`,
        quotationId: quote.id,
      });
    }

    await storage.createNotification({
      organizationId: quote.organizationId,
      type: "quote_approved",
      title: "Offerte goedgekeurd",
      message: `${quote.clientName} heeft offerte #${quote.id} goedgekeurd`,
      relatedId: quote.id,
    });

    res.json(updated);
  });

  app.post("/api/public/quote/:token/reject", async (req, res) => {
    const quote = await storage.getQuotationByToken(req.params.token);
    if (!quote) return res.status(404).json({ message: "Quote not found" });

    const updated = await storage.updateQuotation(quote.id, {
      status: "rejected",
      rejectionReason: req.body.reason || "",
      auditLog: [
        ...((quote.auditLog as any[]) || []),
        { action: "rejected", timestamp: new Date().toISOString(), reason: req.body.reason },
      ],
    });

    await storage.createNotification({
      organizationId: quote.organizationId,
      type: "quote_rejected",
      title: "Offerte afgewezen",
      message: `${quote.clientName} heeft offerte #${quote.id} afgewezen`,
      relatedId: quote.id,
    });

    res.json(updated);
  });

  app.get("/api/form-templates", requireAuth, async (req, res) => {
    const user = req.user as any;
    const templates = await storage.getFormTemplates(user.organizationId);
    res.json(templates);
  });

  app.post("/api/form-templates", requireAuth, async (req, res) => {
    const user = req.user as any;
    const template = await storage.createFormTemplate({
      ...req.body,
      organizationId: user.organizationId,
    });
    res.status(201).json(template);
  });

  app.patch("/api/form-templates/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const updated = await storage.updateFormTemplate(id, req.body);
    res.json(updated);
  });

  async function resolveOrg(idOrSlug: string) {
    let org = await storage.getOrganization(idOrSlug);
    if (!org) org = await storage.getOrganizationBySlug(idOrSlug);
    return org;
  }

  app.get("/api/public/lead-form/:orgIdOrSlug", async (req, res) => {
    const org = await resolveOrg(req.params.orgIdOrSlug);
    if (!org) return res.status(404).json({ message: "Organization not found" });

    const template = await storage.getPublishedFormTemplate(org.id);
    const priceItems = await storage.getPriceMatrixItems(org.id);

    const safeItems = priceItems.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      unit: item.unit,
      isOptional: item.isOptional,
      dependsOnItemId: item.dependsOnItemId,
      dependsOnCondition: item.dependsOnCondition,
    }));

    res.json({ organization: org, template, priceItems: safeItems });
  });

  app.get("/api/public/calendar/:orgIdOrSlug/unavailable", async (req, res) => {
    const org = await resolveOrg(req.params.orgIdOrSlug);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    const events = await storage.getCalendarEvents(org.id);
    const employees = await storage.getEmployeesByOrg(org.id);
    const employeeCount = Math.max(employees.length, 1);

    const dateBlockCounts: Record<string, Set<string>> = {};
    events
      .filter((e) => (e.type === "unavailable" || e.type === "booked") && !e.startTime)
      .forEach((e) => {
        const key = e.date;
        if (!dateBlockCounts[key]) dateBlockCounts[key] = new Set();
        dateBlockCounts[key].add(e.employeeId || "__owner__");
      });

    const blockedDates = Object.entries(dateBlockCounts)
      .filter(([_, blockers]) => blockers.size >= employeeCount)
      .map(([date]) => date);

    res.json(blockedDates);
  });

  app.get("/api/public/calendar/:orgIdOrSlug/opening-hours", async (req, res) => {
    const org = await resolveOrg(req.params.orgIdOrSlug);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    res.json(org.openingHours || {});
  });

  app.get("/api/public/calendar/:orgIdOrSlug/booked-times", async (req, res) => {
    const org = await resolveOrg(req.params.orgIdOrSlug);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    const { date } = req.query;
    if (!date) return res.json([]);
    const events = await storage.getCalendarEvents(org.id);
    const employees = await storage.getEmployeesByOrg(org.id);
    const employeeCount = Math.max(employees.length, 1);

    const timeBlockCounts: Record<string, Set<string>> = {};
    events
      .filter((e) => e.date === date && (e.type === "booked" || e.type === "unavailable") && e.startTime)
      .forEach((e) => {
        const key = e.startTime!;
        if (!timeBlockCounts[key]) timeBlockCounts[key] = new Set();
        timeBlockCounts[key].add(e.employeeId || "__owner__");
      });

    const bookedTimes = Object.entries(timeBlockCounts)
      .filter(([_, blockers]) => blockers.size >= employeeCount)
      .map(([time]) => time);

    res.json(bookedTimes);
  });

  app.post("/api/public/lead-form/:orgIdOrSlug/submit", async (req, res) => {
    const org = await resolveOrg(req.params.orgIdOrSlug);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    const orgId = org.id;
    const { clientName, clientEmail, clientPhone, clientCompany, notes, selectedServices, desiredStartDate, desiredStartTime } = req.body;

    const allPriceItems = await storage.getPriceMatrixItems(orgId);
    const token = randomBytes(32).toString("hex");

    let subtotal = 0;
    const itemsToCreate: any[] = [];
    const serviceNames: string[] = [];

    if (selectedServices && Array.isArray(selectedServices)) {
      for (const service of selectedServices) {
        const priceItem = allPriceItems.find((p) => p.id === service.id);
        if (!priceItem) continue;

        const qty = parseFloat(service.quantity || "1");
        const price = parseFloat(priceItem.unitPrice) * qty;
        subtotal += price;
        serviceNames.push(priceItem.name);

        itemsToCreate.push({
          name: priceItem.name,
          description: priceItem.description || "",
          quantity: service.quantity || "1",
          unitPrice: priceItem.unitPrice,
          unit: priceItem.unit || "unit",
          isOptional: false,
          isSelected: true,
          total: price.toFixed(2),
        });
      }
    }

    const vatAmount = subtotal * 0.21;
    const total = subtotal + vatAmount;

    const quote = await storage.createQuotation({
      organizationId: orgId,
      token,
      status: "quote_sent",
      clientName,
      clientEmail,
      clientPhone: clientPhone || "",
      clientCompany: clientCompany || "",
      desiredStartDate: desiredStartDate || "",
      desiredStartTime: desiredStartTime || "",
      notes: notes || "",
      subtotal: subtotal.toFixed(2),
      vatAmount: vatAmount.toFixed(2),
      total: total.toFixed(2),
      includeVat: true,
      auditLog: [
        { action: "lead_submitted", timestamp: new Date().toISOString() },
        { action: "quote_sent", timestamp: new Date().toISOString() },
      ],
    });

    for (const item of itemsToCreate) {
      await storage.createQuoteItem({ ...item, quotationId: quote.id });
    }

    if (desiredStartDate) {
      await storage.createCalendarEvent({
        organizationId: orgId,
        date: desiredStartDate,
        startTime: desiredStartTime || null,
        type: "requested",
        title: `Aanvraag: ${clientName}`,
        notes: notes || "",
        quotationId: quote.id,
      });
    }

    const baseUrl = getBaseUrl(req);
    const quoteLink = `${baseUrl}/quote/${token}`;
    const html = buildQuoteEmailHtml(
      org.name,
      clientName,
      quoteLink,
      org.primaryColor || "#1d4ed8"
    );
    sendEmailWithCopy(org, clientEmail, `Uw offerte van ${org.name}`, html).catch(console.error);

    if (org.email) {
      const notifHtml = buildNewLeadNotificationHtml(
        clientName,
        clientEmail,
        serviceNames,
        notes || "",
        desiredStartDate || ""
      );
      sendEmail(org, org.email, `Nieuwe aanvraag van ${clientName}`, notifHtml).catch(console.error);
    }

    await storage.createNotification({
      organizationId: orgId,
      type: "new_lead",
      title: "Nieuwe aanvraag",
      message: `${clientName} heeft een offerte aangevraagd`,
      relatedId: quote.id,
    });

    res.status(201).json({ success: true, message: "Lead submitted successfully" });
  });

  app.get("/api/calendar/events", requireAuth, async (req, res) => {
    const user = req.user as any;
    const { start, end } = req.query;
    let events;
    if (start && end) {
      events = await storage.getCalendarEventsByDateRange(
        user.organizationId,
        start as string,
        end as string
      );
    } else {
      events = await storage.getCalendarEvents(user.organizationId);
    }
    if (user.role === "medewerker") {
      events = events.filter(e => e.employeeId === user.id || !e.employeeId);
    }
    res.json(events);
  });

  app.post("/api/calendar/events", requireAuth, async (req, res) => {
    const user = req.user as any;
    const event = await storage.createCalendarEvent({
      ...req.body,
      organizationId: user.organizationId,
      employeeId: user.role === "medewerker" ? user.id : (req.body.employeeId || null),
    });
    res.status(201).json(event);
  });

  app.patch("/api/calendar/events/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const updated = await storage.updateCalendarEvent(id, req.body);
    res.json(updated);
  });

  app.delete("/api/calendar/events/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteCalendarEvent(id);
    res.json({ success: true });
  });

  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    const user = req.user as any;
    let quotes = await storage.getQuotations(user.organizationId);
    if (user.role === "medewerker") {
      quotes = quotes.filter(q => q.assignedEmployeeId === user.id);
    }

    const totalRevenue = quotes
      .filter((q) => q.status === "paid")
      .reduce((sum, q) => sum + parseFloat(q.total || "0"), 0);

    const pipelineValue = quotes
      .filter((q) => ["quote_sent", "viewed", "approved"].includes(q.status || ""))
      .reduce((sum, q) => sum + parseFloat(q.total || "0"), 0);

    const activeQuotes = quotes.filter((q) => ["quote_sent", "viewed", "approved"].includes(q.status || "")).length;
    const openInvoices = quotes.filter((q) => q.status === "invoiced").length;

    const statusCounts: Record<string, number> = {};
    for (const q of quotes) {
      const s = q.status || "new_lead";
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }

    const response: any = {
      totalRevenue,
      pipelineValue,
      activeQuotes,
      openInvoices,
      totalQuotes: quotes.length,
      statusCounts,
      recentQuotes: quotes.slice(0, 5),
      role: user.role,
    };

    if (user.role === "medewerker") {
      let events = await storage.getCalendarEvents(user.organizationId);
      events = events.filter(e => e.employeeId === user.id || !e.employeeId);
      const upcomingEvents = events
        .filter(e => new Date(e.date) >= new Date(new Date().toISOString().split("T")[0]))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);
      response.upcomingEvents = upcomingEvents;

      let dossiers = await storage.getDossiers(user.organizationId);
      dossiers = dossiers.filter(d => d.assignedEmployeeId === user.id);
      response.assignedDossiers = dossiers.length;
      response.openDossiers = dossiers.filter(d => d.status === "open").length;
    }

    res.json(response);
  });

  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const safeUsers = allUsers.map(({ password: _, ...u }) => u);
      res.json(safeUsers);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const adminUser = req.user as any;
      if (req.params.id === adminUser.id) {
        return res.status(400).json({ message: "Je kunt jezelf niet verwijderen" });
      }
      await storage.deleteUser(req.params.id);
      res.json({ message: "Gebruiker verwijderd" });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get("/api/admin/organizations", requireAdmin, async (_req, res) => {
    try {
      const orgs = await storage.getAllOrganizations();
      res.json(orgs);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.get("/api/admin/settings", requireAdmin, async (_req, res) => {
    try {
      const settings = await storage.getGlobalSettings();
      res.json(settings || {});
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.patch("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.upsertGlobalSettings(req.body);
      res.json(settings);
    } catch (err) {
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const allOrgs = await storage.getAllOrganizations();
      const subscriptionCounts: Record<string, number> = {};
      for (const org of allOrgs) {
        const status = org.subscriptionStatus || "trial";
        subscriptionCounts[status] = (subscriptionCounts[status] || 0) + 1;
      }
      res.json({
        totalUsers: allUsers.length,
        totalOrganizations: allOrgs.length,
        subscriptionCounts,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.patch("/api/admin/organizations/:id", requireAdmin, async (req, res) => {
    try {
      const { subscriptionStatus } = req.body;
      const updated = await storage.updateOrganization(req.params.id, { subscriptionStatus });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update organization" });
    }
  });

  // Employee routes
  app.get("/api/employees", requireAuth, requireOwner, async (req, res) => {
    const user = req.user as any;
    const employees = await storage.getEmployeesByOrg(user.organizationId);
    const safeEmployees = employees.map(({ password: _, ...u }) => u);
    res.json(safeEmployees);
  });

  app.post("/api/employees", requireAuth, requireOwner, async (req, res) => {
    const user = req.user as any;
    const org = await storage.getOrganization(user.organizationId);
    if (!org) return res.status(404).json({ message: "Organization not found" });

    const employees = await storage.getEmployeesByOrg(user.organizationId);
    const maxEmployees = org.maxEmployees || 3;
    if (employees.length >= maxEmployees) {
      return res.status(403).json({ message: `Maximum ${maxEmployees} medewerkers bereikt. Upgrade uw abonnement.` });
    }

    const { fullName, email, phone } = req.body;
    if (!fullName || !email) return res.status(400).json({ message: "Naam en e-mail zijn verplicht" });

    const existing = await storage.getUserByUsername(email);
    if (existing) return res.status(400).json({ message: "Er bestaat al een account met dit e-mailadres" });

    const plainPassword = generatePassword();
    const { scrypt, randomBytes: rb } = await import("crypto");
    const { promisify } = await import("util");
    const scryptAsync = promisify(scrypt);
    const salt = rb(16).toString("hex");
    const buf = (await scryptAsync(plainPassword, salt, 64)) as Buffer;
    const hashedPassword = `${buf.toString("hex")}.${salt}`;

    const employee = await storage.createUser({
      username: email,
      password: hashedPassword,
      role: "medewerker",
      fullName,
      phone: phone || null,
      organizationId: user.organizationId,
      isAdmin: false,
    });

    const baseUrl = getBaseUrl(req);
    const loginLink = `${baseUrl}/auth`;
    const emailHtml = buildEmployeeInviteEmailHtml(
      org.name,
      fullName,
      email,
      plainPassword,
      loginLink,
      org.primaryColor || "#1d4ed8"
    );
    sendEmail(org, email, `Uitnodiging medewerker - ${org.name}`, emailHtml).catch(console.error);

    const { password: _, ...safeEmployee } = employee;
    res.status(201).json(safeEmployee);
  });

  app.patch("/api/employees/:id", requireAuth, requireOwner, async (req, res) => {
    const user = req.user as any;
    const employee = await storage.getUser(req.params.id);
    if (!employee || employee.organizationId !== user.organizationId || employee.role !== "medewerker") {
      return res.status(404).json({ message: "Medewerker niet gevonden" });
    }

    const updates: any = {};
    if (req.body.fullName) updates.fullName = req.body.fullName;
    if (req.body.phone !== undefined) updates.phone = req.body.phone;
    if (req.body.password) {
      const { scrypt, randomBytes: rb } = await import("crypto");
      const { promisify } = await import("util");
      const scryptAsync = promisify(scrypt);
      const salt = rb(16).toString("hex");
      const buf = (await scryptAsync(req.body.password, salt, 64)) as Buffer;
      updates.password = `${buf.toString("hex")}.${salt}`;
    }

    const updated = await storage.updateUser(req.params.id, updates);
    const { password: _, ...safeUser } = updated;
    res.json(safeUser);
  });

  app.delete("/api/employees/:id", requireAuth, requireOwner, async (req, res) => {
    const user = req.user as any;
    const employee = await storage.getUser(req.params.id);
    if (!employee || employee.organizationId !== user.organizationId || employee.role !== "medewerker") {
      return res.status(404).json({ message: "Medewerker niet gevonden" });
    }
    await storage.deleteUser(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/quotations/:id/assign", requireAuth, requireOwner, async (req, res) => {
    const id = parseInt(req.params.id);
    const { employeeId } = req.body;
    const user = req.user as any;

    const quote = await storage.getQuotation(id);
    if (!quote || quote.organizationId !== user.organizationId) {
      return res.status(404).json({ message: "Offerte niet gevonden" });
    }

    await storage.updateQuotation(id, { assignedEmployeeId: employeeId || null });

    const dossier = await storage.getDossierByQuotation(id);
    if (dossier) {
      await storage.updateDossier(dossier.id, { assignedEmployeeId: employeeId || null });
    }

    const events = await storage.getCalendarEvents(user.organizationId);
    const quoteEvents = events.filter(e => e.quotationId === id);
    for (const event of quoteEvents) {
      await storage.updateCalendarEvent(event.id, { employeeId: employeeId || null });
    }

    res.json({ success: true });
  });

  app.post("/api/client/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "E-mail en wachtwoord zijn verplicht" });

    const allOrgs = await storage.getAllOrganizations();
    let clientUser = null;
    for (const org of allOrgs) {
      const found = await storage.getClientUserByEmail(email, org.id);
      if (found) { clientUser = found; break; }
    }

    if (!clientUser || clientUser.password !== hashPassword(password)) {
      return res.status(401).json({ message: "Ongeldige inloggegevens" });
    }

    res.json({ token: clientUser.loginToken, name: clientUser.name, email: clientUser.email });
  });

  app.get("/api/client/auto-login/:token", async (req, res) => {
    const clientUser = await storage.getClientUserByToken(req.params.token);
    if (!clientUser) return res.status(404).json({ message: "Ongeldige link" });
    res.json({ token: clientUser.loginToken, name: clientUser.name, email: clientUser.email });
  });

  app.get("/api/client/dossier/:token", async (req, res) => {
    const clientUser = await storage.getClientUserByToken(req.params.token);
    if (!clientUser) return res.status(404).json({ message: "Ongeldige link" });

    const dossier = await storage.getDossierByClientToken(req.params.token);
    if (!dossier) return res.status(404).json({ message: "Geen dossier gevonden" });

    const org = await storage.getOrganization(clientUser.organizationId);
    const quote = dossier.quotationId ? await storage.getQuotation(dossier.quotationId) : null;
    const signature = await storage.getDossierSignature(dossier.id);

    res.json({ dossier, organization: org, quotation: quote, clientUser: { name: clientUser.name, email: clientUser.email }, signature });
  });

  app.get("/api/client/dossier/:token/entries", async (req, res) => {
    const clientUser = await storage.getClientUserByToken(req.params.token);
    if (!clientUser) return res.status(404).json({ message: "Ongeldige link" });

    const dossier = await storage.getDossierByClientToken(req.params.token);
    if (!dossier) return res.status(404).json({ message: "Geen dossier gevonden" });

    const entries = await storage.getDossierEntries(dossier.id);
    res.json(entries);
  });

  app.get("/api/client/dossier/:token/messages", async (req, res) => {
    const clientUser = await storage.getClientUserByToken(req.params.token);
    if (!clientUser) return res.status(404).json({ message: "Ongeldige link" });

    const dossier = await storage.getDossierByClientToken(req.params.token);
    if (!dossier) return res.status(404).json({ message: "Geen dossier gevonden" });

    await storage.markMessagesRead(dossier.id, "tenant");
    const messages = await storage.getDossierMessages(dossier.id);
    res.json(messages);
  });

  app.post("/api/client/dossier/:token/messages", uploadDossierFile.single("file"), async (req, res) => {
    const clientUser = await storage.getClientUserByToken(req.params.token);
    if (!clientUser) return res.status(404).json({ message: "Ongeldige link" });

    const dossier = await storage.getDossierByClientToken(req.params.token);
    if (!dossier) return res.status(404).json({ message: "Geen dossier gevonden" });

    const message = await storage.createDossierMessage({
      dossierId: dossier.id,
      senderType: "client",
      senderName: clientUser.name,
      message: req.body.message || "",
      filePath: req.file ? `/uploads/${req.file.filename}` : null,
    });

    await storage.createNotification({
      organizationId: dossier.organizationId,
      type: "new_message",
      title: req.file ? "Nieuwe foto/bestand" : "Nieuw bericht",
      message: `${clientUser.name} heeft ${req.file ? "een foto/bestand geüpload" : "een bericht gestuurd"} in dossier "${dossier.title}"`,
      relatedId: dossier.id,
    });

    const org = await storage.getOrganization(dossier.organizationId);
    if (org?.email) {
      const emailHtml = buildDossierMessageEmailHtml(
        org.name,
        org.name,
        clientUser.name,
        req.body.message || "Nieuwe foto/bestand geüpload",
        `${getBaseUrl(req)}/dossiers/${dossier.id}`,
        org.primaryColor || "#1d4ed8"
      );
      sendEmail(org, org.email, `Nieuw bericht van ${clientUser.name} - Dossier`, emailHtml).catch(console.error);
    }

    if (req.file) {
      await storage.createDossierEntry({
        dossierId: dossier.id,
        type: "photo",
        content: req.body.message || null,
        filePath: `/uploads/${req.file.filename}`,
        caption: req.body.message || null,
        createdBy: "client",
      });
    }

    res.status(201).json(message);
  });

  app.post("/api/client/dossier/:token/sign", async (req, res) => {
    const clientUser = await storage.getClientUserByToken(req.params.token);
    if (!clientUser) return res.status(404).json({ message: "Ongeldige link" });

    const dossier = await storage.getDossierByClientToken(req.params.token);
    if (!dossier) return res.status(404).json({ message: "Geen dossier gevonden" });

    const { signature, feedback, rating } = req.body;
    if (!signature) return res.status(400).json({ message: "Handtekening is verplicht" });

    const sig = await storage.createDossierSignature({
      dossierId: dossier.id,
      signature,
      feedback: feedback || null,
      rating: rating || null,
    });

    await storage.updateDossier(dossier.id, { status: "signed" });

    await storage.createNotification({
      organizationId: dossier.organizationId,
      type: "dossier_signed",
      title: "Dossier ondertekend",
      message: `${clientUser.name} heeft dossier "${dossier.title}" ondertekend${rating ? ` (${rating}/5 sterren)` : ""}`,
      relatedId: dossier.id,
    });

    res.status(201).json(sig);
  });

  app.get("/api/dossiers", requireAuth, async (req, res) => {
    const user = req.user as any;
    let dossiersData = await storage.getDossiers(user.organizationId);
    if (user.role === "medewerker") {
      dossiersData = dossiersData.filter(d => d.assignedEmployeeId === user.id);
    }
    const enriched = await Promise.all(dossiersData.map(async (d) => {
      const clientUser = d.clientUserId ? await storage.getClientUser(d.clientUserId) : null;
      const quote = d.quotationId ? await storage.getQuotation(d.quotationId) : null;
      const signature = await storage.getDossierSignature(d.id);
      return { ...d, clientName: clientUser?.name || quote?.clientName || "Onbekend", clientEmail: clientUser?.email || "", hasSignature: !!signature };
    }));
    res.json(enriched);
  });

  app.get("/api/dossiers/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const dossier = await storage.getDossier(id);
    if (!dossier) return res.status(404).json({ message: "Dossier niet gevonden" });

    const clientUser = dossier.clientUserId ? await storage.getClientUser(dossier.clientUserId) : null;
    const quote = dossier.quotationId ? await storage.getQuotation(dossier.quotationId) : null;
    const entries = await storage.getDossierEntries(id);
    const messages = await storage.getDossierMessages(id);
    const signature = await storage.getDossierSignature(id);

    await storage.markMessagesRead(id, "client");

    res.json({
      dossier,
      clientUser: clientUser ? { name: clientUser.name, email: clientUser.email, phone: clientUser.phone, company: clientUser.company } : null,
      quotation: quote,
      entries,
      messages,
      signature,
    });
  });

  app.post("/api/dossiers/:id/entries", requireAuth, uploadDossierFile.single("file"), async (req, res) => {
    const id = parseInt(req.params.id);
    const dossier = await storage.getDossier(id);
    if (!dossier) return res.status(404).json({ message: "Dossier niet gevonden" });

    const entry = await storage.createDossierEntry({
      dossierId: id,
      type: req.body.type || "photo",
      content: req.body.content || null,
      filePath: req.file ? `/uploads/${req.file.filename}` : null,
      caption: req.body.caption || null,
      createdBy: "tenant",
    });
    res.status(201).json(entry);
  });

  app.patch("/api/dossiers/:id/entries/:entryId", requireAuth, async (req, res) => {
    const entryId = parseInt(req.params.entryId);
    const { caption } = req.body;
    const updated = await storage.updateDossierEntry(entryId, { caption: caption || null });
    res.json(updated);
  });

  app.delete("/api/dossiers/:id/entries/:entryId", requireAuth, async (req, res) => {
    await storage.deleteDossierEntry(parseInt(req.params.entryId));
    res.json({ success: true });
  });

  app.get("/api/dossiers/:id/messages", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.markMessagesRead(id, "client");
    const messages = await storage.getDossierMessages(id);
    res.json(messages);
  });

  app.post("/api/dossiers/:id/messages", requireAuth, uploadDossierFile.single("file"), async (req, res) => {
    const id = parseInt(req.params.id);
    const user = req.user as any;
    const org = await storage.getOrganization(user.organizationId);
    const dossier = await storage.getDossier(id);
    if (!dossier) return res.status(404).json({ message: "Dossier niet gevonden" });

    const message = await storage.createDossierMessage({
      dossierId: id,
      senderType: "tenant",
      senderName: user.fullName || org?.name || "Bedrijf",
      message: req.body.message || "",
      filePath: req.file ? `/uploads/${req.file.filename}` : null,
    });

    if (dossier.clientUserId && org) {
      const clientUser = await storage.getClientUser(dossier.clientUserId);
      if (clientUser) {
        const baseUrl = getBaseUrl(req);
        const portalLink = `${baseUrl}/portal?token=${clientUser.loginToken}`;
        const emailHtml = buildDossierMessageEmailHtml(
          org.name,
          clientUser.name,
          user.fullName || org.name,
          req.body.message || "Nieuw bestand gedeeld",
          portalLink,
          org.primaryColor || "#1d4ed8"
        );
        sendEmail(org, clientUser.email, `Nieuw bericht - ${org.name}`, emailHtml).catch(console.error);
      }
    }

    res.status(201).json(message);
  });

  app.patch("/api/dossiers/:id/complete", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const updated = await storage.updateDossier(id, { status: "completed" });
    res.json(updated);
  });

  app.delete("/api/dossiers/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteDossier(id);
    res.json({ success: true });
  });

  app.get("/api/notifications", requireAuth, async (req, res) => {
    const user = req.user as any;
    const notifs = await storage.getNotifications(user.organizationId);
    res.json(notifs);
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    const user = req.user as any;
    const count = await storage.getUnreadNotificationCount(user.organizationId);
    res.json({ count });
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    await storage.markNotificationRead(parseInt(req.params.id));
    res.json({ success: true });
  });

  app.patch("/api/notifications/read-all", requireAuth, async (req, res) => {
    const user = req.user as any;
    await storage.markAllNotificationsRead(user.organizationId);
    res.json({ success: true });
  });

  return httpServer;
}
