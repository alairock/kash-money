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
import { getCurrentUserLimits } from '../utils/superAdminStorage';
import { countItemsCreatedThisMonth, PLAN_LIMIT_REACHED_TOOLTIP } from '../utils/limits';

export const Invoices = () => {
  const primaryButtonClass =
    'gradient-primary rounded-xl px-4 py-3 font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-2xl';
  const actionButtonClass =
    'glass-effect rounded-xl px-3 py-1 text-sm font-semibold text-white/80 transition-all hover:scale-105 hover:text-white';
  const successActionButtonClass =
    'glass-effect rounded-xl px-3 py-1 text-sm font-semibold text-green-300 transition-all hover:scale-105';
  const infoActionButtonClass =
    'glass-effect rounded-xl px-3 py-1 text-sm font-semibold text-blue-300 transition-all hover:scale-105';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | Invoice['status']>('all');
  const [companySettings, setCompanySettings] = useState<CompanySettings | undefined>(undefined);
  const [invoiceLimit, setInvoiceLimit] = useState(2);
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
    try {
      const [loadedInvoices, loadedCompanySettings, limits] = await Promise.all([
        getInvoices(),
        getCompanySettings(),
        getCurrentUserLimits(),
      ]);
      setInvoices(loadedInvoices);
      setCompanySettings(loadedCompanySettings);
      setInvoiceLimit(limits.invoicesPerMonth);
    } catch (error) {
      console.error('Error loading invoices:', error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
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

  const invoicesThisMonth = useMemo(() => countItemsCreatedThisMonth(invoices), [invoices]);
  const createInvoiceDisabled = invoicesThisMonth >= invoiceLimit;

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

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="order-2 flex w-full min-w-0 flex-nowrap gap-2 overflow-x-auto pr-1 text-sm sm:order-1 sm:flex-1">
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

        <div className="order-1 self-start sm:order-2 sm:ml-auto">
          <Tooltip content={createInvoiceDisabled ? PLAN_LIMIT_REACHED_TOOLTIP : ''}>
            <button
              type="button"
              onClick={() => navigate('/billing/invoices/new')}
              disabled={createInvoiceDisabled}
              className={`${primaryButtonClass} w-[13.5rem] text-sm disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-60 disabled:hover:scale-100`}
            >
              ✨ Create New Invoice
            </button>
          </Tooltip>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="glass-dark p-12 text-center rounded-xl">
          <p className="text-xl text-white/70">No invoices yet</p>
          <p className="text-sm text-white/50 mt-2">
            Create your first invoice to get started
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {filteredInvoices.map((invoice) => (
              <div key={invoice.id} className="glass-dark rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-white/70">{invoice.clientName}</p>
                  </div>
                  <span className="text-sm font-bold text-green-400">
                    {formatCurrency(invoice.total)}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getStatusBadgeClass(invoice.status)}`}
                  >
                    {invoice.status}
                  </span>
                  {invoice.status === 'paid' && invoice.datePaid && (
                    <span className="text-xs text-white/60">
                      Paid {formatDate(invoice.datePaid)}
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-white/70">
                  <div>
                    <p className="text-white/50">Created</p>
                    <p>{formatDate(invoice.dateCreated)}</p>
                  </div>
                  <div className="justify-self-end text-right">
                    <p className="text-white/50">Due</p>
                    <p>{formatDate(invoice.dateDue)}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {invoice.status !== 'paid' && (
                    <Tooltip content="Mark as Paid">
                      <button
                        type="button"
                        onClick={() => handleMarkAsPaid(invoice)}
                        className={successActionButtonClass}
                        title="Mark as Paid"
                      >
                        Paid?
                      </button>
                    </Tooltip>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(`/billing/invoices/${invoice.id}/edit`)}
                    className={actionButtonClass}
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadPDF(invoice)}
                    className={actionButtonClass}
                    title="Download PDF"
                  >
                    📄
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendEmail(invoice)}
                    className={infoActionButtonClass}
                    title="Send Email"
                  >
                    📧
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden lg:block glass-dark rounded-xl overflow-hidden">
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
                          <Tooltip content="Mark as Paid">
                            <button
                              type="button"
                              onClick={() => handleMarkAsPaid(invoice)}
                              className={successActionButtonClass}
                              title="Mark as Paid"
                            >
                              Paid?
                            </button>
                          </Tooltip>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/billing/invoices/${invoice.id}/edit`)}
                          className={actionButtonClass}
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(invoice)}
                          className={actionButtonClass}
                          title="Download PDF"
                        >
                          📄
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendEmail(invoice)}
                          className={infoActionButtonClass}
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
        </>
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
