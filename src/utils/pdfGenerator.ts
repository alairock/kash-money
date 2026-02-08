import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice, Client, CompanySettings } from '../types/billing';
import { formatCurrency } from './formatCurrency';

// Extend jsPDF to include autoTable property
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const generateInvoicePDF = (
  invoice: Invoice,
  client: Client,
  company: CompanySettings
): jsPDF => {
  const doc = new jsPDF();

  // Header - "INVOICE"
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 105, 25, { align: 'center' });

  // Company info (top left)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(company.companyName, 20, 45);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  let yPos = 50;
  doc.text(company.email, 20, yPos);
  if (company.phone) {
    yPos += 5;
    doc.text(company.phone, 20, yPos);
  }
  if (company.address) {
    yPos += 5;
    const addressLines = company.address.split('\n');
    addressLines.forEach((line) => {
      doc.text(line, 20, yPos);
      yPos += 5;
    });
  }

  // Invoice details (top right)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice #:', 130, 45);
  doc.text('Date:', 130, 50);
  doc.text('Due:', 130, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoiceNumber, 160, 45);
  doc.text(formatDate(invoice.dateCreated), 160, 50);
  doc.text(formatDate(invoice.dateDue), 160, 55);

  // Bill To section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 20, 75);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  yPos = 80;
  doc.text(client.name, 20, yPos);
  if (client.company) {
    yPos += 5;
    doc.text(client.company, 20, yPos);
  }
  yPos += 5;
  doc.text(client.email, 20, yPos);
  if (client.phone) {
    yPos += 5;
    doc.text(client.phone, 20, yPos);
  }
  if (client.address) {
    const clientAddressLines = client.address.split('\n');
    clientAddressLines.forEach((line) => {
      yPos += 5;
      doc.text(line, 20, yPos);
    });
  }

  // Line items table
  const tableStartY = yPos + 15;
  autoTable(doc, {
    startY: tableStartY,
    head: [['Description', 'Hours', 'Rate', 'Amount']],
    body: invoice.lineItems.map((item) => [
      item.description,
      item.hours.toFixed(2),
      formatCurrency(item.rate),
      formatCurrency(item.amount),
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 25, halign: 'right' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
  });

  // Get the Y position after the table
  const finalY = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY || tableStartY + 50;

  // Total
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', 130, finalY + 15);
  doc.text(formatCurrency(invoice.total), 190, finalY + 15, { align: 'right' });

  // Payment terms
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Terms:', 20, finalY + 30);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.terms, 60, finalY + 30);

  // Notes (if any)
  if (invoice.notes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 20, finalY + 40);
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(invoice.notes, 170);
    doc.text(notesLines, 20, finalY + 45);
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Thank you for your business!', 105, pageHeight - 15, { align: 'center' });

  return doc;
};

export const downloadInvoicePDF = async (
  invoice: Invoice,
  client: Client,
  company: CompanySettings
): Promise<void> => {
  const doc = generateInvoicePDF(invoice, client, company);
  doc.save(`${invoice.invoiceNumber}.pdf`);
};

export const getInvoicePDFBlob = async (
  invoice: Invoice,
  client: Client,
  company: CompanySettings
): Promise<Blob> => {
  const doc = generateInvoicePDF(invoice, client, company);
  return doc.output('blob');
};
