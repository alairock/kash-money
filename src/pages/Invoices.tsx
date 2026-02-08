import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInvoices, updateInvoice, getClient, getCompanySettings } from '../utils/billingStorage';
import type { Invoice, Client, CompanySettings } from '../types/billing';
import { formatCurrency } from '../utils/formatCurrency';
import { downloadInvoicePDF } from '../utils/pdfGenerator';
import { EmailPreviewModal } from '../components/EmailPreviewModal';
import { Tooltip } from '../components/Tooltip';

export const Invoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailModalData, setEmailModalData] = useState<{
    invoice: Invoice;
    client: Client;
    company: CompanySettings;
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    const loadedInvoices = await getInvoices();
    setInvoices(loadedInvoices);
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadgeClass = (status: Invoice['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'sent':
        return 'bg-blue-500/20 text-blue-300';
      case 'paid':
        return 'bg-green-500/20 text-green-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    const updated = {
      ...invoice,
      status: 'paid' as const,
      datePaid: new Date().toISOString(),
    };
    await updateInvoice(updated);
    setInvoices(invoices.map((inv) => (inv.id === invoice.id ? updated : inv)));
  };

  const handleUnmarkAsPaid = async (invoice: Invoice) => {
    // Remove datePaid by excluding it from the updated object
    const { datePaid, ...invoiceWithoutDatePaid } = invoice;

    // Revert to 'sent' if it was sent, otherwise back to 'draft'
    const status = invoice.dateSent ? ('sent' as const) : ('draft' as const);

    const updated = {
      ...invoiceWithoutDatePaid,
      status,
    };
    await updateInvoice(updated as Invoice);
    setInvoices(invoices.map((inv) => (inv.id === invoice.id ? updated as Invoice : inv)));
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      const client = await getClient(invoice.clientId);
      const company = await getCompanySettings();

      if (!client || !company) {
        alert('Missing client or company settings');
        return;
      }

      await downloadInvoicePDF(invoice, client, company);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF');
    }
  };

  const handleSendEmail = async (invoice: Invoice) => {
    const company = await getCompanySettings();
    const client = await getClient(invoice.clientId);

    if (!company || !company.companyName || !company.email) {
      alert('Please complete your company settings before sending invoices');
      return;
    }

    if (!client) {
      alert('Client not found');
      return;
    }

    setEmailModalData({ invoice, client, company });
  };

  const handleEmailSent = () => {
    loadInvoices(); // Reload to get updated status
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-xl text-white/70">Loading invoices...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Invoices</h2>
        <button
          type="button"
          onClick={() => navigate('/billing/invoices/new')}
          className="gradient-primary rounded-lg px-6 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105"
        >
          ✨ Create New Invoice
        </button>
      </div>

      {invoices.length === 0 ? (
        <div className="glass-dark p-12 text-center rounded-xl">
          <p className="text-xl text-white/70">No invoices yet</p>
          <p className="text-sm text-white/50 mt-2">
            Create your first invoice to get started
          </p>
        </div>
      ) : (
        <div className="glass-dark rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                  Invoice #
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                  Client
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                  Created
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                  Due Date
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-white/80">
                  Amount
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-white/80">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-semibold">{invoice.invoiceNumber}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white/80">{invoice.clientName}</span>
                  </td>
                  <td className="px-6 py-4">
                    {invoice.status === 'paid' && invoice.datePaid ? (
                      <Tooltip content={`Paid: ${formatDate(invoice.datePaid)}`}>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getStatusBadgeClass(invoice.status)}`}
                        >
                          {invoice.status}
                        </span>
                      </Tooltip>
                    ) : (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getStatusBadgeClass(invoice.status)}`}
                      >
                        {invoice.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white/70 text-sm">
                      {formatDate(invoice.dateCreated)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white/70 text-sm">
                      {formatDate(invoice.dateDue)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-bold text-green-400">
                      {formatCurrency(invoice.total)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/billing/invoices/${invoice.id}/edit`)}
                        className="rounded glass-effect px-3 py-1 text-sm font-semibold text-white/70 transition-all hover:text-white"
                        title="Edit"
                      >
                        Edit
                      </button>
                      {invoice.status !== 'paid' ? (
                        <button
                          type="button"
                          onClick={() => handleMarkAsPaid(invoice)}
                          className="rounded glass-effect px-3 py-1 text-sm font-semibold text-green-400 transition-all hover:scale-105"
                          title="Mark as Paid"
                        >
                          Paid
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUnmarkAsPaid(invoice)}
                          className="rounded glass-effect px-3 py-1 text-sm font-semibold text-yellow-400 transition-all hover:scale-105"
                          title="Unmark as Paid"
                        >
                          Unpaid
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDownloadPDF(invoice)}
                        className="rounded glass-effect px-3 py-1 text-sm font-semibold text-white/70 transition-all hover:text-white"
                        title="Download PDF"
                      >
                        📄
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendEmail(invoice)}
                        className="rounded glass-effect px-3 py-1 text-sm font-semibold text-blue-400 transition-all hover:scale-105"
                        title="Send Email"
                      >
                        📧
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {emailModalData && (
        <EmailPreviewModal
          invoice={emailModalData.invoice}
          client={emailModalData.client}
          company={emailModalData.company}
          onClose={() => setEmailModalData(null)}
          onSent={handleEmailSent}
        />
      )}
    </div>
  );
};
