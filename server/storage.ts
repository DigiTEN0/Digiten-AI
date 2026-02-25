import { eq, desc, and, gte, lte } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  organizations,
  priceMatrixItems,
  quotations,
  quoteItems,
  formTemplates,
  calendarEvents,
  globalSettings,
  clientUsers,
  dossiers,
  dossierEntries,
  dossierMessages,
  dossierSignatures,
  notifications,
  type InsertUser,
  type User,
  type InsertOrganization,
  type Organization,
  type InsertPriceMatrixItem,
  type PriceMatrixItem,
  type InsertQuotation,
  type Quotation,
  type InsertQuoteItem,
  type QuoteItem,
  type InsertFormTemplate,
  type FormTemplate,
  type InsertCalendarEvent,
  type CalendarEvent,
  type GlobalSettings,
  type InsertGlobalSettings,
  type InsertClientUser,
  type ClientUser,
  type InsertDossier,
  type Dossier,
  type InsertDossierEntry,
  type DossierEntry,
  type InsertDossierMessage,
  type DossierMessage,
  type InsertDossierSignature,
  type DossierSignature,
  type InsertNotification,
  type Notification,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization>;

  getPriceMatrixItems(orgId: string): Promise<PriceMatrixItem[]>;
  createPriceMatrixItem(item: InsertPriceMatrixItem): Promise<PriceMatrixItem>;
  updatePriceMatrixItem(id: number, data: Partial<InsertPriceMatrixItem>): Promise<PriceMatrixItem>;
  deletePriceMatrixItem(id: number): Promise<void>;

  getQuotations(orgId: string): Promise<Quotation[]>;
  getQuotation(id: number): Promise<Quotation | undefined>;
  getQuotationByToken(token: string): Promise<Quotation | undefined>;
  createQuotation(quote: InsertQuotation): Promise<Quotation>;
  updateQuotation(id: number, data: Partial<InsertQuotation>): Promise<Quotation>;

  getQuoteItems(quotationId: number): Promise<QuoteItem[]>;
  createQuoteItem(item: InsertQuoteItem): Promise<QuoteItem>;
  updateQuoteItem(id: number, data: Partial<InsertQuoteItem>): Promise<QuoteItem>;
  deleteQuoteItem(id: number): Promise<void>;
  deleteQuoteItemsByQuotation(quotationId: number): Promise<void>;

  getFormTemplates(orgId: string): Promise<FormTemplate[]>;
  getFormTemplate(id: number): Promise<FormTemplate | undefined>;
  getPublishedFormTemplate(orgId: string): Promise<FormTemplate | undefined>;
  createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate>;
  updateFormTemplate(id: number, data: Partial<InsertFormTemplate>): Promise<FormTemplate>;

  getCalendarEvents(orgId: string): Promise<CalendarEvent[]>;
  getCalendarEventsByDateRange(orgId: string, startDate: string, endDate: string): Promise<CalendarEvent[]>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, data: Partial<InsertCalendarEvent>): Promise<CalendarEvent>;
  deleteCalendarEvent(id: number): Promise<void>;

  getEmployeesByOrg(orgId: string): Promise<User[]>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User>;

  getAllUsers(): Promise<(User & { organizationName?: string })[]>;
  deleteUser(id: string): Promise<void>;
  getAllOrganizations(): Promise<Organization[]>;

  getGlobalSettings(): Promise<GlobalSettings | undefined>;
  upsertGlobalSettings(data: InsertGlobalSettings): Promise<GlobalSettings>;

  getClientUser(id: number): Promise<ClientUser | undefined>;
  getClientUserByEmail(email: string, orgId: string): Promise<ClientUser | undefined>;
  getClientUserByToken(token: string): Promise<ClientUser | undefined>;
  createClientUser(user: InsertClientUser): Promise<ClientUser>;

  getDossiers(orgId: string): Promise<Dossier[]>;
  getDossier(id: number): Promise<Dossier | undefined>;
  getDossierByQuotation(quotationId: number): Promise<Dossier | undefined>;
  getDossierByClientToken(token: string): Promise<Dossier | undefined>;
  createDossier(dossier: InsertDossier): Promise<Dossier>;
  updateDossier(id: number, data: Partial<InsertDossier>): Promise<Dossier>;
  deleteDossier(id: number): Promise<void>;

  getDossierEntries(dossierId: number): Promise<DossierEntry[]>;
  createDossierEntry(entry: InsertDossierEntry): Promise<DossierEntry>;
  updateDossierEntry(id: number, data: Partial<InsertDossierEntry>): Promise<DossierEntry>;
  deleteDossierEntry(id: number): Promise<void>;

  getDossierMessages(dossierId: number): Promise<DossierMessage[]>;
  createDossierMessage(message: InsertDossierMessage): Promise<DossierMessage>;
  markMessagesRead(dossierId: number, senderType: string): Promise<void>;

  getDossierSignature(dossierId: number): Promise<DossierSignature | undefined>;
  createDossierSignature(signature: InsertDossierSignature): Promise<DossierSignature>;

  getNotifications(orgId: string): Promise<Notification[]>;
  getUnreadNotificationCount(orgId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;
  markAllNotificationsRead(orgId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug));
    return org;
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [created] = await db.insert(organizations).values(org).returning();
    return created;
  }

  async updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization> {
    const [updated] = await db.update(organizations).set(data).where(eq(organizations.id, id)).returning();
    return updated;
  }

  async getPriceMatrixItems(orgId: string): Promise<PriceMatrixItem[]> {
    return db.select().from(priceMatrixItems).where(eq(priceMatrixItems.organizationId, orgId)).orderBy(priceMatrixItems.sortOrder);
  }

  async createPriceMatrixItem(item: InsertPriceMatrixItem): Promise<PriceMatrixItem> {
    const [created] = await db.insert(priceMatrixItems).values(item).returning();
    return created;
  }

  async updatePriceMatrixItem(id: number, data: Partial<InsertPriceMatrixItem>): Promise<PriceMatrixItem> {
    const [updated] = await db.update(priceMatrixItems).set(data).where(eq(priceMatrixItems.id, id)).returning();
    return updated;
  }

  async deletePriceMatrixItem(id: number): Promise<void> {
    await db.delete(priceMatrixItems).where(eq(priceMatrixItems.id, id));
  }

  async getQuotations(orgId: string): Promise<Quotation[]> {
    return db.select().from(quotations).where(eq(quotations.organizationId, orgId)).orderBy(desc(quotations.createdAt));
  }

  async getQuotation(id: number): Promise<Quotation | undefined> {
    const [quote] = await db.select().from(quotations).where(eq(quotations.id, id));
    return quote;
  }

  async getQuotationByToken(token: string): Promise<Quotation | undefined> {
    const [quote] = await db.select().from(quotations).where(eq(quotations.token, token));
    return quote;
  }

  async createQuotation(quote: InsertQuotation): Promise<Quotation> {
    const [created] = await db.insert(quotations).values(quote).returning();
    return created;
  }

  async updateQuotation(id: number, data: Partial<InsertQuotation>): Promise<Quotation> {
    const [updated] = await db.update(quotations).set({ ...data, updatedAt: new Date() }).where(eq(quotations.id, id)).returning();
    return updated;
  }

  async getQuoteItems(quotationId: number): Promise<QuoteItem[]> {
    return db.select().from(quoteItems).where(eq(quoteItems.quotationId, quotationId));
  }

  async createQuoteItem(item: InsertQuoteItem): Promise<QuoteItem> {
    const [created] = await db.insert(quoteItems).values(item).returning();
    return created;
  }

  async updateQuoteItem(id: number, data: Partial<InsertQuoteItem>): Promise<QuoteItem> {
    const [updated] = await db.update(quoteItems).set(data).where(eq(quoteItems.id, id)).returning();
    return updated;
  }

  async deleteQuoteItem(id: number): Promise<void> {
    await db.delete(quoteItems).where(eq(quoteItems.id, id));
  }

  async deleteQuoteItemsByQuotation(quotationId: number): Promise<void> {
    await db.delete(quoteItems).where(eq(quoteItems.quotationId, quotationId));
  }

  async getFormTemplates(orgId: string): Promise<FormTemplate[]> {
    return db.select().from(formTemplates).where(eq(formTemplates.organizationId, orgId));
  }

  async getFormTemplate(id: number): Promise<FormTemplate | undefined> {
    const [template] = await db.select().from(formTemplates).where(eq(formTemplates.id, id));
    return template;
  }

  async getPublishedFormTemplate(orgId: string): Promise<FormTemplate | undefined> {
    const [template] = await db.select().from(formTemplates).where(
      and(eq(formTemplates.organizationId, orgId), eq(formTemplates.isPublished, true))
    );
    return template;
  }

  async createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate> {
    const [created] = await db.insert(formTemplates).values(template).returning();
    return created;
  }

  async updateFormTemplate(id: number, data: Partial<InsertFormTemplate>): Promise<FormTemplate> {
    const [updated] = await db.update(formTemplates).set(data).where(eq(formTemplates.id, id)).returning();
    return updated;
  }

  async getCalendarEvents(orgId: string): Promise<CalendarEvent[]> {
    return db.select().from(calendarEvents).where(eq(calendarEvents.organizationId, orgId)).orderBy(calendarEvents.date);
  }

  async getCalendarEventsByDateRange(orgId: string, startDate: string, endDate: string): Promise<CalendarEvent[]> {
    return db.select().from(calendarEvents).where(
      and(
        eq(calendarEvents.organizationId, orgId),
        gte(calendarEvents.date, startDate),
        lte(calendarEvents.date, endDate)
      )
    ).orderBy(calendarEvents.date);
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const [created] = await db.insert(calendarEvents).values(event).returning();
    return created;
  }

  async updateCalendarEvent(id: number, data: Partial<InsertCalendarEvent>): Promise<CalendarEvent> {
    const [updated] = await db.update(calendarEvents).set(data).where(eq(calendarEvents.id, id)).returning();
    return updated;
  }

  async deleteCalendarEvent(id: number): Promise<void> {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  }

  async getEmployeesByOrg(orgId: string): Promise<User[]> {
    return db.select().from(users).where(
      and(eq(users.organizationId, orgId), eq(users.role, "medewerker"))
    );
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async getAllUsers(): Promise<(User & { organizationName?: string })[]> {
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        password: users.password,
        role: users.role,
        fullName: users.fullName,
        phone: users.phone,
        organizationId: users.organizationId,
        isAdmin: users.isAdmin,
        organizationName: organizations.name,
      })
      .from(users)
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .orderBy(users.username);
    return rows.map((r) => ({
      ...r,
      organizationName: r.organizationName ?? undefined,
    }));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllOrganizations(): Promise<Organization[]> {
    return db.select().from(organizations).orderBy(organizations.name);
  }

  async getGlobalSettings(): Promise<GlobalSettings | undefined> {
    const [settings] = await db.select().from(globalSettings);
    return settings;
  }

  async upsertGlobalSettings(data: InsertGlobalSettings): Promise<GlobalSettings> {
    const existing = await this.getGlobalSettings();
    if (existing) {
      const [updated] = await db
        .update(globalSettings)
        .set(data)
        .where(eq(globalSettings.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(globalSettings).values(data).returning();
    return created;
  }

  async getClientUser(id: number): Promise<ClientUser | undefined> {
    const [user] = await db.select().from(clientUsers).where(eq(clientUsers.id, id));
    return user;
  }

  async getClientUserByEmail(email: string, orgId: string): Promise<ClientUser | undefined> {
    const [user] = await db.select().from(clientUsers).where(
      and(eq(clientUsers.email, email), eq(clientUsers.organizationId, orgId))
    );
    return user;
  }

  async getClientUserByToken(token: string): Promise<ClientUser | undefined> {
    const [user] = await db.select().from(clientUsers).where(eq(clientUsers.loginToken, token));
    return user;
  }

  async createClientUser(user: InsertClientUser): Promise<ClientUser> {
    const [created] = await db.insert(clientUsers).values(user).returning();
    return created;
  }

  async getDossiers(orgId: string): Promise<Dossier[]> {
    return db.select().from(dossiers).where(eq(dossiers.organizationId, orgId)).orderBy(desc(dossiers.createdAt));
  }

  async getDossier(id: number): Promise<Dossier | undefined> {
    const [dossier] = await db.select().from(dossiers).where(eq(dossiers.id, id));
    return dossier;
  }

  async getDossierByQuotation(quotationId: number): Promise<Dossier | undefined> {
    const [dossier] = await db.select().from(dossiers).where(eq(dossiers.quotationId, quotationId));
    return dossier;
  }

  async getDossierByClientToken(token: string): Promise<Dossier | undefined> {
    const clientUser = await this.getClientUserByToken(token);
    if (!clientUser) return undefined;
    const [dossier] = await db.select().from(dossiers).where(eq(dossiers.clientUserId, clientUser.id));
    return dossier;
  }

  async createDossier(dossier: InsertDossier): Promise<Dossier> {
    const [created] = await db.insert(dossiers).values(dossier).returning();
    return created;
  }

  async updateDossier(id: number, data: Partial<InsertDossier>): Promise<Dossier> {
    const [updated] = await db.update(dossiers).set({ ...data, updatedAt: new Date() }).where(eq(dossiers.id, id)).returning();
    return updated;
  }

  async deleteDossier(id: number): Promise<void> {
    await db.delete(dossierMessages).where(eq(dossierMessages.dossierId, id));
    await db.delete(dossierEntries).where(eq(dossierEntries.dossierId, id));
    await db.delete(dossierSignatures).where(eq(dossierSignatures.dossierId, id));
    await db.delete(dossiers).where(eq(dossiers.id, id));
  }

  async getDossierEntries(dossierId: number): Promise<DossierEntry[]> {
    return db.select().from(dossierEntries).where(eq(dossierEntries.dossierId, dossierId)).orderBy(desc(dossierEntries.createdAt));
  }

  async createDossierEntry(entry: InsertDossierEntry): Promise<DossierEntry> {
    const [created] = await db.insert(dossierEntries).values(entry).returning();
    return created;
  }

  async updateDossierEntry(id: number, data: Partial<InsertDossierEntry>): Promise<DossierEntry> {
    const [updated] = await db.update(dossierEntries).set(data).where(eq(dossierEntries.id, id)).returning();
    return updated;
  }

  async deleteDossierEntry(id: number): Promise<void> {
    await db.delete(dossierEntries).where(eq(dossierEntries.id, id));
  }

  async getDossierMessages(dossierId: number): Promise<DossierMessage[]> {
    return db.select().from(dossierMessages).where(eq(dossierMessages.dossierId, dossierId)).orderBy(dossierMessages.createdAt);
  }

  async createDossierMessage(message: InsertDossierMessage): Promise<DossierMessage> {
    const [created] = await db.insert(dossierMessages).values(message).returning();
    return created;
  }

  async markMessagesRead(dossierId: number, senderType: string): Promise<void> {
    await db.update(dossierMessages).set({ isRead: true }).where(
      and(eq(dossierMessages.dossierId, dossierId), eq(dossierMessages.senderType, senderType))
    );
  }

  async getDossierSignature(dossierId: number): Promise<DossierSignature | undefined> {
    const [sig] = await db.select().from(dossierSignatures).where(eq(dossierSignatures.dossierId, dossierId));
    return sig;
  }

  async createDossierSignature(signature: InsertDossierSignature): Promise<DossierSignature> {
    const [created] = await db.insert(dossierSignatures).values(signature).returning();
    return created;
  }

  async getNotifications(orgId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.organizationId, orgId)).orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(orgId: string): Promise<number> {
    const result = await db.select().from(notifications).where(
      and(eq(notifications.organizationId, orgId), eq(notifications.isRead, false))
    );
    return result.length;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(orgId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.organizationId, orgId));
  }
}

export const storage = new DatabaseStorage();
