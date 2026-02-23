import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getInvoices,
  updateInvoice,
  getClient,
  getCompanySettings,
} from '../utils/billingStorage';
import type { Invoice, Client, CompanySettings } from '../types/billing';
import { formatCurrency } from '../utils/formatCurrency';
import { downloadInvoicePDF } from '../utils/pdfGenerator';
import { EmailPreviewModal } from '../components/EmailPreviewModal';
import { Tooltip } from '../components/Tooltip';

export const Invoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | Invoice['status']>('all');
  const [companySettings, setCompanySettings] = useState<CompanySettings | undefined>(undefined);
  const [emailModalData, setEmailModalData] = useState<{
    invoice: Invoice;
    client: Client;
    company: CompanySettings;
  } | null>(null);
  const navigate = useNavigate();

  const currentYearStart = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return new Date(currentYear, 0, 1);
  }, []);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    const [loadedInvoices, loadedCompanySettings] = await Promise.all([
      getInvoices(),
      getCompanySettings(),
    ]);
    setInvoices(loadedInvoices);
    setCompanySettings(loadedCompanySettings);
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
      case 'archived':
        return 'bg-gray-500/30 text-gray-200';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const totalsSinceYearStart = useMemo(() => {
    const yearInvoices = invoices.filter((invoice) => new Date(invoice.dateCreated) >= currentYearStart);

    const paid = yearInvoices
      .filter((invoice) => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + invoice.total, 0);

    const unpaid = yearInvoices
      .filter((invoice) => invoice.status !== 'paid')
      .reduce((sum, invoice) => sum + invoice.total, 0);

    return {
      paid,
      unpaid,
      combined: paid + unpaid,
    };
  }, [invoices, currentYearStart]);

  const statusCounts = useMemo(() => {
    const counts: Record<Invoice['status'], number> = {
      draft: 0,
      sent: 0,
      paid: 0,
      archived: 0,
    };

    for (const invoice of invoices) {
      counts[invoice.status] += 1;
    }

    return counts;
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    if (statusFilter === 'all') {
      return invoices;
    }

    return invoices.filter((invoice) => invoice.status === statusFilter);
  }, [invoices, statusFilter]);

  const taxSetAsidePercentage = companySettings?.taxSetAsidePercentage || 0;
  const paidTaxesToBePaid =
    (totalsSinceYearStart.paid * taxSetAsidePercentage) / 100;
  const unpaidTaxesToBePaid =
    (totalsSinceYearStart.unpaid * taxSetAsidePercentage) / 100;
  const estimatedTaxesToSetAside =
    (totalsSinceYearStart.combined * taxSetAsidePercentage) / 100;
  const paidNetAfterTaxes =
    totalsSinceYearStart.paid - (totalsSinceYearStart.paid * taxSetAsidePercentage) / 100;
  const unpaidNetAfterTaxes =
    totalsSinceYearStart.unpaid - (totalsSinceYearStart.unpaid * taxSetAsidePercentage) / 100;
  const netTotalAfterTaxes =
    totalsSinceYearStart.combined - estimatedTaxesToSetAside;

  const handleMarkAsPaid = async (invoice: Invoice) => {
    const updated: Invoice = {
      ...invoice,
      status: 'paid',
      datePaid: new Date().toISOString(),
    };

    await updateInvoice(updated);
    setInvoices(invoices.map((inv) => (inv.id === invoice.id ? updated : inv)));
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
    const company = companySettings || (await getCompanySettings());
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
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="glass-dark rounded-xl p-4">
          <p className="text-sm text-white/60">Paid since Jan 1</p>
          <p className="mt-1 text-2xl font-bold text-green-400">
            {formatCurrency(totalsSinceYearStart.paid)}
          </p>
          <p className="mt-1 text-xs text-white/60">
            Net after taxes: {formatCurrency(paidNetAfterTaxes)}
          </p>
          <p className="mt-1 text-xs text-white/50">
            Taxes to be paid: {formatCurrency(paidTaxesToBePaid)}
          </p>
        </div>
        <div className="glass-dark rounded-xl p-4">
          <p className="text-sm text-white/60">Unpaid since Jan 1</p>
          <p className="mt-1 text-2xl font-bold text-yellow-300">
            {formatCurrency(totalsSinceYearStart.unpaid)}
          </p>
          <p className="mt-1 text-xs text-white/60">
            Net after taxes: {formatCurrency(unpaidNetAfterTaxes)}
          </p>
          <p className="mt-1 text-xs text-white/50">
            Taxes to be paid: {formatCurrency(unpaidTaxesToBePaid)}
          </p>
        </div>
        <div className="glass-dark rounded-xl p-4">
          <p className="text-sm text-white/60">Total since Jan 1</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {formatCurrency(totalsSinceYearStart.combined)}
          </p>
          <p className="mt-1 text-xs text-white/60">
            Net after taxes: {formatCurrency(netTotalAfterTaxes)}
          </p>
          <p className="mt-1 text-xs text-white/50">
            Taxes to be paid: {formatCurrency(estimatedTaxesToSetAside)}
          </p>
        </div>
        <div className="glass-dark rounded-xl p-4">
          <p className="text-sm text-white/60">Estimated Taxes to Set Aside</p>
          <p className="mt-1 text-2xl font-bold text-orange-300">
            {formatCurrency(estimatedTaxesToSetAside)}
          </p>
          <p className="mt-1 text-xs text-white/50">
            {taxSetAsidePercentage}% of total since Jan 1
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`rounded px-3 py-1 transition-colors ${
              statusFilter === 'all' ? 'bg-white/20 text-white' : 'glass-effect text-white/70 hover:text-white'
            }`}
          >
            All ({invoices.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('draft')}
            className={`rounded px-3 py-1 transition-colors ${
              statusFilter === 'draft' ? 'bg-yellow-500/20 text-yellow-300' : 'glass-effect text-white/70 hover:text-white'
            }`}
          >
            Draft ({statusCounts.draft})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('sent')}
            className={`rounded px-3 py-1 transition-colors ${
              statusFilter === 'sent' ? 'bg-blue-500/20 text-blue-300' : 'glass-effect text-white/70 hover:text-white'
            }`}
          >
            Sent ({statusCounts.sent})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('paid')}
            className={`rounded px-3 py-1 transition-colors ${
              statusFilter === 'paid' ? 'bg-green-500/20 text-green-300' : 'glass-effect text-white/70 hover:text-white'
            }`}
          >
            Paid ({statusCounts.paid})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('archived')}
            className={`rounded px-3 py-1 transition-colors ${
              statusFilter === 'archived'
                ? 'bg-gray-500/30 text-gray-200'
                : 'glass-effect text-white/70 hover:text-white'
            }`}
          >
            Archived ({statusCounts.archived})
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate('/billing/invoices/new')}
          className="ml-auto gradient-primary rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105"
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
              {filteredInvoices.map((invoice) => (
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
                      {invoice.status !== 'paid' && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsPaid(invoice)}
                          className="rounded glass-effect px-3 py-1 text-sm font-semibold text-green-400 transition-all hover:scale-105"
                          title="Mark as Paid"
                        >
                          Paid
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(`/billing/invoices/${invoice.id}/edit`)}
                        className="rounded glass-effect px-3 py-1 text-sm font-semibold text-white/70 transition-all hover:text-white"
                        title="Edit"
                      >
                        Edit
                      </button>
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
