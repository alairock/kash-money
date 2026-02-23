import {
  collection,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QueryConstraint,
  doc,
  getDocs,
  getCountFromServer,
  getAggregateFromServer,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  runTransaction,
  where,
  startAfter,
  limit,
  sum,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import type { Client, Invoice, CompanySettings } from '../types/billing';
import { getCurrentUserLimits } from './superAdminStorage';
import { countItemsCreatedThisMonth, createPlanLimitError } from './limits';

const CLIENTS_COLLECTION = 'clients';
const INVOICES_COLLECTION = 'invoices';
const SETTINGS_COLLECTION = 'settings';
const COUNTERS_COLLECTION = 'counters';

export type InvoiceStatusFilter = 'all' | Invoice['status'];
export type InvoicesPageCursor = QueryDocumentSnapshot<DocumentData> | null;
export type ClientsPageCursor = QueryDocumentSnapshot<DocumentData> | null;

export interface ClientsPageResult {
  clients: Client[];
  hasMore: boolean;
  nextCursor: ClientsPageCursor;
}

export interface InvoicesPageResult {
  invoices: Invoice[];
  hasMore: boolean;
  nextCursor: InvoicesPageCursor;
}

export interface InvoiceTotalsSummary {
  paid: number;
  unpaid: number;
  combined: number;
}

const normalizeInvoiceStatus = (status: unknown): Invoice['status'] | null => {
  if (typeof status !== 'string') return null;
  const normalized = status.toLowerCase();
  if (normalized === 'draft' || normalized === 'sent' || normalized === 'paid' || normalized === 'archived') {
    return normalized;
  }
  return null;
};

const parseDateValue = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }
  return null;
};

// Helper to get user ID from authenticated user
const getUserId = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('User not authenticated');
  }
  return uid;
};

// Clients
export const getClients = async (): Promise<Client[]> => {
  try {
    const userId = getUserId();
    const clientsRef = collection(db, 'users', userId, CLIENTS_COLLECTION);
    const q = query(clientsRef, orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Client[];
  } catch (error) {
    console.error('Error getting clients:', error);
    return [];
  }
};

export const getClientsPage = async ({
  pageSize = 10,
  cursor = null,
}: {
  pageSize?: number;
  cursor?: ClientsPageCursor;
}): Promise<ClientsPageResult> => {
  try {
    const userId = getUserId();
    const clientsRef = collection(db, 'users', userId, CLIENTS_COLLECTION);
    const constraints: QueryConstraint[] = [orderBy('name', 'asc')];
    if (cursor) {
      constraints.push(startAfter(cursor));
    }
    constraints.push(limit(pageSize + 1));

    const snapshot = await getDocs(query(clientsRef, ...constraints));
    const hasMore = snapshot.docs.length > pageSize;
    const pageDocs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

    return {
      clients: pageDocs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      })) as Client[],
      hasMore,
      nextCursor: pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null,
    };
  } catch (error) {
    console.error('Error getting clients page:', error);
    return {
      clients: [],
      hasMore: false,
      nextCursor: null,
    };
  }
};

export const getClientsCount = async (): Promise<number> => {
  try {
    const userId = getUserId();
    const clientsRef = collection(db, 'users', userId, CLIENTS_COLLECTION);
    const snapshot = await getCountFromServer(query(clientsRef));
    return snapshot.data().count;
  } catch (error) {
    console.error('Error getting clients count:', error);
    return 0;
  }
};

export const getClient = async (id: string): Promise<Client | undefined> => {
  try {
    const userId = getUserId();
    const clientRef = doc(db, 'users', userId, CLIENTS_COLLECTION, id);
    const snapshot = await getDoc(clientRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Client;
    }
    return undefined;
  } catch (error) {
    console.error('Error getting client:', error);
    return undefined;
  }
};

export const createClient = async (client: Client): Promise<void> => {
  try {
    const userId = getUserId();
    const [existingClientsCount, limits] = await Promise.all([getClientsCount(), getCurrentUserLimits()]);
    if (existingClientsCount >= limits.clients) {
      throw createPlanLimitError();
    }

    const clientRef = doc(db, 'users', userId, CLIENTS_COLLECTION, client.id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...clientData } = client;
    await setDoc(clientRef, clientData);
  } catch (error) {
    console.error('Error creating client:', error);
    throw error;
  }
};

export const updateClient = async (client: Client): Promise<void> => {
  try {
    const userId = getUserId();
    const clientRef = doc(db, 'users', userId, CLIENTS_COLLECTION, client.id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...clientData } = client;
    await updateDoc(clientRef, clientData);
  } catch (error) {
    console.error('Error updating client:', error);
    throw error;
  }
};

export const deleteClient = async (id: string): Promise<void> => {
  try {
    const userId = getUserId();
    const clientRef = doc(db, 'users', userId, CLIENTS_COLLECTION, id);
    await deleteDoc(clientRef);
  } catch (error) {
    console.error('Error deleting client:', error);
    throw error;
  }
};

// Invoice Number Generation
export const getInvoiceCounter = async (): Promise<{ year: number; count: number } | null> => {
  try {
    const userId = getUserId();
    const counterRef = doc(db, 'users', userId, COUNTERS_COLLECTION, 'invoiceCounter');
    const counterDoc = await getDoc(counterRef);

    if (counterDoc.exists()) {
      const data = counterDoc.data();
      return { year: data.year, count: data.count };
    }
    return null;
  } catch (error) {
    console.error('Error getting invoice counter:', error);
    return null;
  }
};

export const updateInvoiceCounter = async (year: number, count: number): Promise<void> => {
  try {
    const userId = getUserId();
    const counterRef = doc(db, 'users', userId, COUNTERS_COLLECTION, 'invoiceCounter');
    await setDoc(counterRef, { year, count });
  } catch (error) {
    console.error('Error updating invoice counter:', error);
    throw error;
  }
};

export const getNextInvoiceNumber = async (): Promise<string> => {
  const userId = getUserId();
  const counterRef = doc(db, 'users', userId, COUNTERS_COLLECTION, 'invoiceCounter');

  const currentYear = new Date().getFullYear();

  const invoiceNumber = await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    let count: number;
    let year: number;

    if (!counterDoc.exists()) {
      // First invoice ever
      count = 1;
      year = currentYear;
      transaction.set(counterRef, { year, count });
    } else {
      const data = counterDoc.data();
      year = data.year;
      count = data.count;

      // Reset counter if new year
      if (year !== currentYear) {
        count = 1;
        year = currentYear;
      } else {
        count += 1;
      }

      transaction.update(counterRef, { year, count });
    }

    // Format: INV-2026-0001
    const paddedCount = count.toString().padStart(4, '0');
    return `INV-${year}-${paddedCount}`;
  });

  return invoiceNumber;
};

// Invoices
export const getInvoices = async (): Promise<Invoice[]> => {
  try {
    const userId = getUserId();
    const invoicesRef = collection(db, 'users', userId, INVOICES_COLLECTION);
    const q = query(invoicesRef, orderBy('dateCreated', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Invoice[];
  } catch (error) {
    console.error('Error getting invoices:', error);
    return [];
  }
};

export const getInvoicesPage = async ({
  pageSize = 10,
  cursor = null,
  status = 'all',
}: {
  pageSize?: number;
  cursor?: InvoicesPageCursor;
  status?: InvoiceStatusFilter;
}): Promise<InvoicesPageResult> => {
  try {
    const userId = getUserId();
    const invoicesRef = collection(db, 'users', userId, INVOICES_COLLECTION);
    if (status === 'all') {
      const constraints: QueryConstraint[] = [orderBy('dateCreated', 'desc')];
      if (cursor) {
        constraints.push(startAfter(cursor));
      }
      constraints.push(limit(pageSize + 1));

      const snapshot = await getDocs(query(invoicesRef, ...constraints));
      const hasMore = snapshot.docs.length > pageSize;
      const pageDocs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

      return {
        invoices: pageDocs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        })) as Invoice[],
        hasMore,
        nextCursor: pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null,
      };
    }

    // Filtered pagination without relying on composite indexes. We page over dateCreated
    // and collect only matching status values (normalized for legacy casing).
    const matchedDocs: QueryDocumentSnapshot<DocumentData>[] = [];
    let scanCursor = cursor;
    let exhausted = false;
    const fetchBatchSize = Math.max(pageSize * 3, 30);
    const targetMatches = pageSize + 1;

    while (matchedDocs.length < targetMatches && !exhausted) {
      const constraints: QueryConstraint[] = [orderBy('dateCreated', 'desc')];
      if (scanCursor) {
        constraints.push(startAfter(scanCursor));
      }
      constraints.push(limit(fetchBatchSize));

      const snapshot = await getDocs(query(invoicesRef, ...constraints));
      if (snapshot.empty) {
        exhausted = true;
        break;
      }

      for (const docSnapshot of snapshot.docs) {
        const normalized = normalizeInvoiceStatus(docSnapshot.data().status);
        if (normalized === status) {
          matchedDocs.push(docSnapshot);
          if (matchedDocs.length === targetMatches) {
            break;
          }
        }
      }

      scanCursor = snapshot.docs[snapshot.docs.length - 1] ?? scanCursor;
      if (snapshot.docs.length < fetchBatchSize) {
        exhausted = true;
      }
    }

    const hasMore = matchedDocs.length > pageSize;
    const pageDocs = hasMore ? matchedDocs.slice(0, pageSize) : matchedDocs;
    const nextCursor = pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null;

    return {
      invoices: pageDocs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      })) as Invoice[],
      hasMore,
      nextCursor,
    };
  } catch (error) {
    console.error('Error getting invoice page:', error);
    return {
      invoices: [],
      hasMore: false,
      nextCursor: null,
    };
  }
};

export const getInvoicesCount = async (status: InvoiceStatusFilter = 'all'): Promise<number> => {
  const userId = getUserId();
  const invoicesRef = collection(db, 'users', userId, INVOICES_COLLECTION);
  try {
    const q = status === 'all'
      ? query(invoicesRef)
      : query(invoicesRef, where('status', '==', status));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error('Error getting invoices count via aggregate, falling back to docs:', error);
    try {
      const snapshot = await getDocs(query(invoicesRef));
      if (status === 'all') {
        return snapshot.size;
      }
      return snapshot.docs.filter((docSnapshot) => normalizeInvoiceStatus(docSnapshot.data().status) === status).length;
    } catch (fallbackError) {
      console.error('Error getting invoices count fallback:', fallbackError);
      return 0;
    }
  }
};

export const getInvoicesCreatedThisMonthCount = async (): Promise<number> => {
  const userId = getUserId();
  const invoicesRef = collection(db, 'users', userId, INVOICES_COLLECTION);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  try {
    const snapshot = await getCountFromServer(
      query(invoicesRef, where('dateCreated', '>=', monthStart.toISOString())),
    );
    return snapshot.data().count;
  } catch (error) {
    console.error('Error getting monthly invoices count via aggregate, falling back to docs:', error);
    try {
      const snapshot = await getDocs(query(invoicesRef));
      return snapshot.docs.filter((docSnapshot) => {
        const createdDate = parseDateValue(docSnapshot.data().dateCreated);
        return createdDate ? createdDate >= monthStart : false;
      }).length;
    } catch (fallbackError) {
      console.error('Error getting monthly invoices count fallback:', fallbackError);
      return 0;
    }
  }
};

export const getInvoiceStatusCounts = async (): Promise<Record<Invoice['status'], number>> => {
  const userId = getUserId();
  const invoicesRef = collection(db, 'users', userId, INVOICES_COLLECTION);
  try {
    const [draft, sent, paid, archived] = await Promise.all([
      getCountFromServer(query(invoicesRef, where('status', '==', 'draft'))),
      getCountFromServer(query(invoicesRef, where('status', '==', 'sent'))),
      getCountFromServer(query(invoicesRef, where('status', '==', 'paid'))),
      getCountFromServer(query(invoicesRef, where('status', '==', 'archived'))),
    ]);

    return {
      draft: draft.data().count,
      sent: sent.data().count,
      paid: paid.data().count,
      archived: archived.data().count,
    };
  } catch (error) {
    console.error('Error getting invoice status counts via aggregate, falling back to docs:', error);
    try {
      const snapshot = await getDocs(query(invoicesRef));
      const counts: Record<Invoice['status'], number> = {
        draft: 0,
        sent: 0,
        paid: 0,
        archived: 0,
      };
      for (const docSnapshot of snapshot.docs) {
        const status = normalizeInvoiceStatus(docSnapshot.data().status);
        if (status) {
          counts[status] += 1;
        }
      }
      return counts;
    } catch (fallbackError) {
      console.error('Error getting invoice status counts fallback:', fallbackError);
      return {
        draft: 0,
        sent: 0,
        paid: 0,
        archived: 0,
      };
    }
  }
};

export const getInvoiceTotalsSinceYearStart = async (yearStartIso: string): Promise<InvoiceTotalsSummary> => {
  const userId = getUserId();
  const invoicesRef = collection(db, 'users', userId, INVOICES_COLLECTION);
  try {
    const [combinedAgg, paidAgg] = await Promise.all([
      getAggregateFromServer(
        query(invoicesRef, where('dateCreated', '>=', yearStartIso)),
        { total: sum('total') },
      ),
      getAggregateFromServer(
        query(
          invoicesRef,
          where('dateCreated', '>=', yearStartIso),
          where('status', '==', 'paid'),
        ),
        { total: sum('total') },
      ),
    ]);

    const combined = combinedAgg.data().total ?? 0;
    const paid = paidAgg.data().total ?? 0;
    return {
      paid,
      unpaid: combined - paid,
      combined,
    };
  } catch (error) {
    console.error('Error getting invoice totals via aggregate, falling back to docs:', error);
    try {
      const yearStart = new Date(yearStartIso);
      const snapshot = await getDocs(query(invoicesRef));
      let paid = 0;
      let combined = 0;

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        const createdDate = parseDateValue(data.dateCreated);
        if (!createdDate || createdDate < yearStart) {
          continue;
        }

        const total = typeof data.total === 'number' ? data.total : Number(data.total ?? 0);
        if (Number.isNaN(total)) {
          continue;
        }

        combined += total;
        if (normalizeInvoiceStatus(data.status) === 'paid') {
          paid += total;
        }
      }

      return {
        paid,
        unpaid: combined - paid,
        combined,
      };
    } catch (fallbackError) {
      console.error('Error getting invoice totals fallback:', fallbackError);
      return {
        paid: 0,
        unpaid: 0,
        combined: 0,
      };
    }
  }
};

export const getInvoice = async (id: string): Promise<Invoice | undefined> => {
  try {
    const userId = getUserId();
    const invoiceRef = doc(db, 'users', userId, INVOICES_COLLECTION, id);
    const snapshot = await getDoc(invoiceRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Invoice;
    }
    return undefined;
  } catch (error) {
    console.error('Error getting invoice:', error);
    return undefined;
  }
};

export const createInvoice = async (invoice: Invoice): Promise<void> => {
  try {
    const userId = getUserId();
    const [existingInvoices, limits] = await Promise.all([getInvoices(), getCurrentUserLimits()]);
    if (countItemsCreatedThisMonth(existingInvoices) >= limits.invoicesPerMonth) {
      throw createPlanLimitError();
    }

    const invoiceRef = doc(db, 'users', userId, INVOICES_COLLECTION, invoice.id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...invoiceData } = invoice;
    await setDoc(invoiceRef, invoiceData);
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
};

export const updateInvoice = async (invoice: Invoice): Promise<void> => {
  try {
    const userId = getUserId();
    const invoiceRef = doc(db, 'users', userId, INVOICES_COLLECTION, invoice.id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...invoiceData } = invoice;
    await updateDoc(invoiceRef, invoiceData);
  } catch (error) {
    console.error('Error updating invoice:', error);
    throw error;
  }
};

export const deleteInvoice = async (id: string): Promise<void> => {
  try {
    const userId = getUserId();
    const invoiceRef = doc(db, 'users', userId, INVOICES_COLLECTION, id);
    await deleteDoc(invoiceRef);
  } catch (error) {
    console.error('Error deleting invoice:', error);
    throw error;
  }
};

// Company Settings
export const getCompanySettings = async (): Promise<CompanySettings | undefined> => {
  try {
    const userId = getUserId();
    const settingsRef = doc(db, 'users', userId, SETTINGS_COLLECTION, 'companySettings');
    const snapshot = await getDoc(settingsRef);
    if (snapshot.exists()) {
      return snapshot.data() as CompanySettings;
    }
    return undefined;
  } catch (error) {
    console.error('Error getting company settings:', error);
    return undefined;
  }
};

export const updateCompanySettings = async (settings: CompanySettings): Promise<void> => {
  try {
    const userId = getUserId();
    const settingsRef = doc(db, 'users', userId, SETTINGS_COLLECTION, 'companySettings');
    await setDoc(settingsRef, settings);
  } catch (error) {
    console.error('Error updating company settings:', error);
    throw error;
  }
};
