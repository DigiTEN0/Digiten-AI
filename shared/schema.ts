import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  decimal,
  jsonb,
  serial,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  logo: text("logo"),
  primaryColor: text("primary_color").default("#1d4ed8"),
  accentColor: text("accent_color").default("#3b82f6"),
  vatNumber: text("vat_number"),
  currency: text("currency").default("EUR"),
  quoteFooter: text("quote_footer"),
  termsConditions: text("terms_conditions"),
  emailFromName: text("email_from_name"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  smtpHost: text("smtp_host"),
  smtpPort: text("smtp_port"),
  smtpUser: text("smtp_user"),
  smtpPass: text("smtp_pass"),
  smtpFrom: text("smtp_from"),
  invoicePrefix: text("invoice_prefix").default("INV"),
  invoiceCounter: integer("invoice_counter").default(1000),
  slug: text("slug"),
  logoSize: integer("logo_size").default(40),
  iban: text("iban"),
  kvkNumber: text("kvk_number"),
  openingHours: jsonb("opening_hours").default({}),
  subscriptionStatus: text("subscription_status").default("trial"),
  subscriptionStartDate: timestamp("subscription_start_date"),
  trialEndsAt: timestamp("trial_ends_at"),
  maxEmployees: integer("max_employees").default(3),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("admin"),
  fullName: text("full_name"),
  phone: text("phone"),
  organizationId: varchar("organization_id").references(() => organizations.id),
  isAdmin: boolean("is_admin").default(false),
});

export const globalSettings = pgTable("global_settings", {
  id: serial("id").primaryKey(),
  smtpHost: text("smtp_host"),
  smtpPort: text("smtp_port").default("587"),
  smtpUser: text("smtp_user"),
  smtpPass: text("smtp_pass"),
  smtpFrom: text("smtp_from"),
  emailFromName: text("email_from_name").default("Digiten.ai"),
});

export const priceMatrixItems = pgTable("price_matrix_items", {
  id: serial("id").primaryKey(),
  organizationId: varchar("organization_id")
    .notNull()
    .references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").default("General"),
  unit: text("unit").default("unit"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  isOptional: boolean("is_optional").default(false),
  sortOrder: integer("sort_order").default(0),
  dependsOnItemId: integer("depends_on_item_id"),
  dependsOnCondition: text("depends_on_condition").default("always"),
});

export const quotations = pgTable("quotations", {
  id: serial("id").primaryKey(),
  organizationId: varchar("organization_id")
    .notNull()
    .references(() => organizations.id),
  token: varchar("token").notNull().unique(),
  invoiceNumber: text("invoice_number"),
  status: text("status").default("new_lead"),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  clientPhone: text("client_phone"),
  clientCompany: text("client_company"),
  clientAddress: text("client_address"),
  desiredStartDate: text("desired_start_date"),
  desiredStartTime: text("desired_start_time"),
  invoiceNotes: text("invoice_notes"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).default("21"),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).default("0"),
  includeVat: boolean("include_vat").default(true),
  notes: text("notes"),
  validUntil: timestamp("valid_until"),
  signature: text("signature"),
  signedAt: timestamp("signed_at"),
  rejectionReason: text("rejection_reason"),
  assignedEmployeeId: varchar("assigned_employee_id"),
  auditLog: jsonb("audit_log").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quotationId: integer("quotation_id")
    .notNull()
    .references(() => quotations.id),
  name: text("name").notNull(),
  description: text("description"),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default("1"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").default("unit"),
  isOptional: boolean("is_optional").default(false),
  isSelected: boolean("is_selected").default(true),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).default("0"),
});

export const formTemplates = pgTable("form_templates", {
  id: serial("id").primaryKey(),
  organizationId: varchar("organization_id")
    .notNull()
    .references(() => organizations.id),
  title: text("title").default("Request a Quote"),
  subtitle: text("subtitle"),
  submitText: text("submit_text").default("Submit Request"),
  successMessage: text("success_message").default(
    "Thank you! We will get back to you soon."
  ),
  fields: jsonb("fields").default([]),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  organizationId: varchar("organization_id")
    .notNull()
    .references(() => organizations.id),
  date: text("date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  type: text("type").notNull().default("unavailable"),
  title: text("title"),
  notes: text("notes"),
  quotationId: integer("quotation_id").references(() => quotations.id),
  employeeId: varchar("employee_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clientUsers = pgTable("client_users", {
  id: serial("id").primaryKey(),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  quotationId: integer("quotation_id").references(() => quotations.id),
  email: text("email").notNull(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  company: text("company"),
  loginToken: varchar("login_token").unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dossiers = pgTable("dossiers", {
  id: serial("id").primaryKey(),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  quotationId: integer("quotation_id").references(() => quotations.id),
  clientUserId: integer("client_user_id").references(() => clientUsers.id),
  title: text("title").notNull(),
  status: text("status").default("open"),
  assignedEmployeeId: varchar("assigned_employee_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dossierEntries = pgTable("dossier_entries", {
  id: serial("id").primaryKey(),
  dossierId: integer("dossier_id").notNull().references(() => dossiers.id),
  type: text("type").notNull().default("photo"),
  content: text("content"),
  filePath: text("file_path"),
  caption: text("caption"),
  createdBy: text("created_by").notNull().default("tenant"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dossierMessages = pgTable("dossier_messages", {
  id: serial("id").primaryKey(),
  dossierId: integer("dossier_id").notNull().references(() => dossiers.id),
  senderType: text("sender_type").notNull().default("tenant"),
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  filePath: text("file_path"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dossierSignatures = pgTable("dossier_signatures", {
  id: serial("id").primaryKey(),
  dossierId: integer("dossier_id").notNull().references(() => dossiers.id),
  signature: text("signature").notNull(),
  feedback: text("feedback"),
  rating: integer("rating"),
  signedAt: timestamp("signed_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message"),
  relatedId: integer("related_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertPriceMatrixItemSchema = createInsertSchema(
  priceMatrixItems
).omit({ id: true });
export const insertQuotationSchema = createInsertSchema(quotations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertQuoteItemSchema = createInsertSchema(quoteItems).omit({
  id: true,
});
export const insertFormTemplateSchema = createInsertSchema(formTemplates).omit({
  id: true,
  createdAt: true,
});
export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPriceMatrixItem = z.infer<typeof insertPriceMatrixItemSchema>;
export type PriceMatrixItem = typeof priceMatrixItems.$inferSelect;
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type Quotation = typeof quotations.$inferSelect;
export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;
export type QuoteItem = typeof quoteItems.$inferSelect;
export type InsertFormTemplate = z.infer<typeof insertFormTemplateSchema>;
export type FormTemplate = typeof formTemplates.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;

export const insertClientUserSchema = createInsertSchema(clientUsers).omit({ id: true, createdAt: true });
export const insertDossierSchema = createInsertSchema(dossiers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDossierEntrySchema = createInsertSchema(dossierEntries).omit({ id: true, createdAt: true });
export const insertDossierMessageSchema = createInsertSchema(dossierMessages).omit({ id: true, createdAt: true });
export const insertDossierSignatureSchema = createInsertSchema(dossierSignatures).omit({ id: true, signedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertGlobalSettingsSchema = createInsertSchema(globalSettings).omit({ id: true });

export type InsertClientUser = z.infer<typeof insertClientUserSchema>;
export type ClientUser = typeof clientUsers.$inferSelect;
export type InsertDossier = z.infer<typeof insertDossierSchema>;
export type Dossier = typeof dossiers.$inferSelect;
export type InsertDossierEntry = z.infer<typeof insertDossierEntrySchema>;
export type DossierEntry = typeof dossierEntries.$inferSelect;
export type InsertDossierMessage = z.infer<typeof insertDossierMessageSchema>;
export type DossierMessage = typeof dossierMessages.$inferSelect;
export type InsertDossierSignature = z.infer<typeof insertDossierSignatureSchema>;
export type DossierSignature = typeof dossierSignatures.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertGlobalSettings = z.infer<typeof insertGlobalSettingsSchema>;
export type GlobalSettings = typeof globalSettings.$inferSelect;
