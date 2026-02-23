import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  runTransaction,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import type { Client, Invoice, CompanySettings } from '../types/billing';
import { getCurrentUserLimits } from './superAdminStorage';
import { countItemsCreatedThisMonth, createPlanLimitError } from './limits';

const CLIENTS_COLLECTION = 'clients';
const INVOICES_COLLECTION = 'invoices';
const SETTINGS_COLLECTION = 'settings';
const COUNTERS_COLLECTION = 'counters';

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
    const [existingClients, limits] = await Promise.all([getClients(), getCurrentUserLimits()]);
    if (existingClients.length >= limits.clients) {
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
