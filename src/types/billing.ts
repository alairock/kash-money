export interface Client {
  id: string;
  name: string;
  email: string;
  invoiceCcEmails?: string[];
  company?: string;
  hourlyRate: number;
  phone?: string;
  address?: string;
  dateCreated: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  hours: number;
  rate: number;
  amount: number; // hours * rate (calculated)
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // Format: "INV-2026-0001"
  clientId: string;
  clientName: string; // Denormalized for display
  clientEmail: string; // Denormalized for sending
  dateCreated: string;
  dateSent?: string;
  dateDue: string; // Auto-calculated: dateCreated + 30 days
  datePaid?: string;
  status: 'draft' | 'sent' | 'paid' | 'archived';
  lineItems: InvoiceLineItem[];
  total: number; // Sum of all line items
  notes?: string;
  terms: string; // Default: "Net 30"
}

export interface CompanySettings {
  id: 'default'; // Single document
  companyName: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  defaultInvoiceNotes?: string;
  taxSetAsidePercentage?: number;
}
