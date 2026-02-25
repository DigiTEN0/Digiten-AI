import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function seedDatabase() {
  const existingUser = await storage.getUserByUsername("demo@digiten.ai");
  if (existingUser) return;

  const org = await storage.createOrganization({
    name: "TechBouw Solutions",
    primaryColor: "#1d4ed8",
    accentColor: "#3b82f6",
    vatNumber: "NL123456789B01",
    currency: "EUR",
    address: "Herengracht 100, 1015 BS Amsterdam",
    phone: "+31 20 123 4567",
    email: "info@techbouw.nl",
    website: "https://techbouw.nl",
    quoteFooter: "Alle prijzen zijn exclusief BTW tenzij anders vermeld. Betalingstermijn: 14 dagen.",
    termsConditions: "Op al onze offertes en overeenkomsten zijn onze algemene voorwaarden van toepassing.",
    emailFromName: "TechBouw Solutions",
  });

  const hashedPassword = await hashPassword("demo123");
  await storage.createUser({
    username: "demo@digiten.ai",
    password: hashedPassword,
    fullName: "Jan de Vries",
    role: "admin",
    organizationId: org.id,
  });

  const services = [
    { name: "Dakisolatie", description: "Volledige dakisolatie met PIR-platen", category: "Isolatie", unit: "m\u00B2", unitPrice: "45.00", sortOrder: 1 },
    { name: "Vloerisolatie", description: "Vloerisolatie met EPS-platen", category: "Isolatie", unit: "m\u00B2", unitPrice: "35.00", sortOrder: 2 },
    { name: "Spouwmuurisolatie", description: "Na-isolatie van spouwmuren", category: "Isolatie", unit: "m\u00B2", unitPrice: "25.00", sortOrder: 3 },
    { name: "HR++ Glas", description: "Vervangen van enkel/dubbel glas door HR++", category: "Ramen & Deuren", unit: "m\u00B2", unitPrice: "180.00", sortOrder: 4 },
    { name: "Kozijn vervangen", description: "Houten kozijn vervangen door kunststof", category: "Ramen & Deuren", unit: "unit", unitPrice: "650.00", sortOrder: 5 },
    { name: "Zonnepanelen installatie", description: "Installatie van zonnepanelen incl. omvormer", category: "Energie", unit: "unit", unitPrice: "350.00", sortOrder: 6, isOptional: true },
    { name: "Warmtepomp", description: "Lucht-water warmtepomp inclusief installatie", category: "Energie", unit: "unit", unitPrice: "4500.00", sortOrder: 7, isOptional: true },
    { name: "Elektra aanleggen", description: "Nieuwe bedrading en groepenkast", category: "Installatie", unit: "uur", unitPrice: "65.00", sortOrder: 8 },
    { name: "Loodgieterswerk", description: "Sanitair en leidingwerk", category: "Installatie", unit: "uur", unitPrice: "55.00", sortOrder: 9 },
    { name: "Schilderwerk buitenzijde", description: "Schilderen van buitenmuren en kozijnen", category: "Afwerking", unit: "m\u00B2", unitPrice: "28.00", sortOrder: 10 },
    { name: "Stucwerk", description: "Stucen van wanden en plafonds", category: "Afwerking", unit: "m\u00B2", unitPrice: "32.00", sortOrder: 11 },
    { name: "Projectmanagement", description: "Begeleiding en coördinatie van het project", category: "Overig", unit: "uur", unitPrice: "85.00", sortOrder: 12, isOptional: true },
  ];

  for (const s of services) {
    await storage.createPriceMatrixItem({
      ...s,
      organizationId: org.id,
      isOptional: s.isOptional || false,
    });
  }

  await storage.createFormTemplate({
    organizationId: org.id,
    title: "Vraag een offerte aan",
    subtitle: "Vul het formulier in en wij nemen zo snel mogelijk contact met u op.",
    submitText: "Offerte aanvragen",
    successMessage: "Bedankt voor uw aanvraag! Wij nemen binnen 24 uur contact met u op.",
    isPublished: true,
    fields: [
      { type: "text", label: "Naam", required: true, name: "clientName" },
      { type: "email", label: "E-mailadres", required: true, name: "clientEmail" },
      { type: "phone", label: "Telefoonnummer", required: false, name: "clientPhone" },
      { type: "text", label: "Bedrijfsnaam", required: false, name: "clientCompany" },
      { type: "services", label: "Selecteer diensten", required: true, name: "services" },
      { type: "textarea", label: "Aanvullende opmerkingen", required: false, name: "notes" },
    ],
  });

  const token1 = randomBytes(32).toString("hex");
  const q1 = await storage.createQuotation({
    organizationId: org.id,
    token: token1,
    status: "approved",
    clientName: "Peter Bakker",
    clientEmail: "peter@bakker-bv.nl",
    clientPhone: "+31 6 12345678",
    clientCompany: "Bakker Vastgoed BV",
    subtotal: "8750.00",
    vatRate: "21",
    vatAmount: "1837.50",
    total: "10587.50",
    includeVat: true,
    notes: "Graag starten in maart",
    signature: "signed",
    signedAt: new Date("2026-02-10"),
    auditLog: [
      { action: "created", timestamp: "2026-02-01T10:00:00Z" },
      { action: "quote_sent", timestamp: "2026-02-01T14:00:00Z" },
      { action: "viewed", timestamp: "2026-02-02T09:00:00Z" },
      { action: "approved", timestamp: "2026-02-10T11:30:00Z" },
    ],
  });
  await storage.createQuoteItem({ quotationId: q1.id, name: "Dakisolatie", quantity: "85", unitPrice: "45.00", unit: "m\u00B2", isSelected: true, total: "3825.00" });
  await storage.createQuoteItem({ quotationId: q1.id, name: "Spouwmuurisolatie", quantity: "120", unitPrice: "25.00", unit: "m\u00B2", isSelected: true, total: "3000.00" });
  await storage.createQuoteItem({ quotationId: q1.id, name: "Projectmanagement", quantity: "20", unitPrice: "85.00", unit: "uur", isSelected: true, isOptional: true, total: "1700.00" });
  await storage.createQuoteItem({ quotationId: q1.id, name: "Schilderwerk buitenzijde", quantity: "0", unitPrice: "28.00", unit: "m\u00B2", isSelected: false, isOptional: true, total: "0.00" });

  const token2 = randomBytes(32).toString("hex");
  const q2 = await storage.createQuotation({
    organizationId: org.id,
    token: token2,
    status: "quote_sent",
    clientName: "Lisa van den Berg",
    clientEmail: "lisa@bergarchitecten.nl",
    clientPhone: "+31 6 87654321",
    clientCompany: "Berg Architecten",
    subtotal: "15200.00",
    vatRate: "21",
    vatAmount: "3192.00",
    total: "18392.00",
    includeVat: true,
    auditLog: [
      { action: "created", timestamp: "2026-02-15T08:00:00Z" },
      { action: "quote_sent", timestamp: "2026-02-15T10:00:00Z" },
    ],
  });
  await storage.createQuoteItem({ quotationId: q2.id, name: "HR++ Glas", quantity: "40", unitPrice: "180.00", unit: "m\u00B2", isSelected: true, total: "7200.00" });
  await storage.createQuoteItem({ quotationId: q2.id, name: "Kozijn vervangen", quantity: "8", unitPrice: "650.00", unit: "unit", isSelected: true, total: "5200.00" });
  await storage.createQuoteItem({ quotationId: q2.id, name: "Schilderwerk buitenzijde", quantity: "100", unitPrice: "28.00", unit: "m\u00B2", isSelected: true, total: "2800.00" });

  const token3 = randomBytes(32).toString("hex");
  const q3 = await storage.createQuotation({
    organizationId: org.id,
    token: token3,
    status: "new_lead",
    clientName: "Mark Jansen",
    clientEmail: "mark.jansen@gmail.com",
    clientPhone: "+31 6 11223344",
    subtotal: "4900.00",
    vatRate: "21",
    vatAmount: "1029.00",
    total: "5929.00",
    includeVat: true,
    notes: "Woning uit 1970, graag eerst een inspectie",
    auditLog: [
      { action: "lead_submitted", timestamp: "2026-02-22T16:00:00Z" },
    ],
  });
  await storage.createQuoteItem({ quotationId: q3.id, name: "Zonnepanelen installatie", quantity: "14", unitPrice: "350.00", unit: "unit", isSelected: true, total: "4900.00" });

  const token4 = randomBytes(32).toString("hex");
  const q4 = await storage.createQuotation({
    organizationId: org.id,
    token: token4,
    status: "invoiced",
    clientName: "Sandra de Wit",
    clientEmail: "sandra@dewitbouw.nl",
    clientCompany: "De Wit Bouw",
    subtotal: "6480.00",
    vatRate: "21",
    vatAmount: "1360.80",
    total: "7840.80",
    includeVat: true,
    signature: "signed",
    signedAt: new Date("2026-01-20"),
    auditLog: [
      { action: "created", timestamp: "2026-01-05T09:00:00Z" },
      { action: "quote_sent", timestamp: "2026-01-05T11:00:00Z" },
      { action: "approved", timestamp: "2026-01-10T14:00:00Z" },
      { action: "invoiced", timestamp: "2026-02-20T10:00:00Z" },
    ],
  });
  await storage.createQuoteItem({ quotationId: q4.id, name: "Stucwerk", quantity: "90", unitPrice: "32.00", unit: "m\u00B2", isSelected: true, total: "2880.00" });
  await storage.createQuoteItem({ quotationId: q4.id, name: "Elektra aanleggen", quantity: "24", unitPrice: "65.00", unit: "uur", isSelected: true, total: "1560.00" });
  await storage.createQuoteItem({ quotationId: q4.id, name: "Loodgieterswerk", quantity: "16", unitPrice: "55.00", unit: "uur", isSelected: true, total: "880.00" });
  await storage.createQuoteItem({ quotationId: q4.id, name: "Projectmanagement", quantity: "12", unitPrice: "85.00", unit: "uur", isSelected: true, total: "1020.00" });

  const token5 = randomBytes(32).toString("hex");
  await storage.createQuotation({
    organizationId: org.id,
    token: token5,
    status: "rejected",
    clientName: "Tom Hendriks",
    clientEmail: "tom@hendriks.nl",
    subtotal: "2250.00",
    vatRate: "21",
    vatAmount: "472.50",
    total: "2722.50",
    includeVat: true,
    rejectionReason: "Te duur, gevonden goedkopere aanbieder",
    auditLog: [
      { action: "created", timestamp: "2026-02-10T08:00:00Z" },
      { action: "rejected", timestamp: "2026-02-14T12:00:00Z" },
    ],
  });

  console.log("Database seeded successfully");
}
