import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getInvoicesPage,
  updateInvoice,
  getClient,
  getCompanySettings,
  getInvoicesCount,
  getInvoiceStatusCounts,
  getInvoiceTotalsSinceYearStart,
  getInvoicesCreatedThisMonthCount,
  type InvoicesPageCursor,
  type InvoiceStatusFilter,
  type InvoiceTotalsSummary,
} from '../utils/billingStorage';
import type { Invoice, Client, CompanySettings } from '../types/billing';
import { formatCurrency } from '../utils/formatCurrency';
import { downloadInvoicePDF } from '../utils/pdfGenerator';
import { EmailPreviewModal } from '../components/EmailPreviewModal';
import { Tooltip } from '../components/Tooltip';
import { getCurrentUserLimits } from '../utils/superAdminStorage';
import { PLAN_LIMIT_REACHED_TOOLTIP } from '../utils/limits';

const ITEMS_PER_PAGE = 10;

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
  const [initialLoading, setInitialLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatusFilter>('all');
  const [companySettings, setCompanySettings] = useState<CompanySettings | undefined>(undefined);
  const [invoiceLimit, setInvoiceLimit] = useState(2);
  const [invoicesThisMonth, setInvoicesThisMonth] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [totalFilteredInvoices, setTotalFilteredInvoices] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [statusCounts, setStatusCounts] = useState<Record<Invoice['status'], number>>({
    draft: 0,
    sent: 0,
    paid: 0,
    archived: 0,
  });
  const [totalsSinceYearStart, setTotalsSinceYearStart] = useState<InvoiceTotalsSummary>({
    paid: 0,
    unpaid: 0,
    combined: 0,
  });
  const [emailModalData, setEmailModalData] = useState<{
    invoice: Invoice;
    client: Client;
    company: CompanySettings;
  } | null>(null);

  const pageCursorsRef = useRef<InvoicesPageCursor[]>([null]);
  const hasLoadedOnceRef = useRef(false);
  const navigate = useNavigate();

  const currentYearStartIso = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return new Date(currentYear, 0, 1).toISOString();
  }, []);

  const loadInvoices = useCallback(
    async ({
      page = 1,
      filter,
      resetCursors = false,
      showInitialLoader = false,
    }: {
      page?: number;
      filter: InvoiceStatusFilter;
      resetCursors?: boolean;
      showInitialLoader?: boolean;
    }) => {
      if (showInitialLoader) {
        setInitialLoading(true);
      } else {
        setListLoading(true);
      }
      try {
        if (resetCursors) {
          pageCursorsRef.current = [null];
        }

        const [
          loadedCompanySettings,
          limits,
          loadedTotalInvoices,
          loadedStatusCounts,
          loadedTotalsSinceYearStart,
          loadedInvoicesThisMonth,
          loadedFilteredCount,
        ] = await Promise.all([
          getCompanySettings(),
          getCurrentUserLimits(),
          getInvoicesCount('all'),
          getInvoiceStatusCounts(),
          getInvoiceTotalsSinceYearStart(currentYearStartIso),
          getInvoicesCreatedThisMonthCount(),
          getInvoicesCount(filter),
        ]);

        const safePage = Math.min(page, Math.max(1, Math.ceil(loadedFilteredCount / ITEMS_PER_PAGE)));
        const pageCursor = pageCursorsRef.current[safePage - 1] ?? null;
        const loadedPage = await getInvoicesPage({
          pageSize: ITEMS_PER_PAGE,
          cursor: pageCursor,
          status: filter,
        });

        setInvoices(loadedPage.invoices);
        setHasNextPage(loadedPage.hasMore);
        setCurrentPage(safePage);
        setTotalInvoices(loadedTotalInvoices);
        setTotalFilteredInvoices(loadedFilteredCount);
        setStatusCounts(loadedStatusCounts);
        setTotalsSinceYearStart(loadedTotalsSinceYearStart);
        setInvoicesThisMonth(loadedInvoicesThisMonth);
        setCompanySettings(loadedCompanySettings);
        setInvoiceLimit(limits.invoicesPerMonth);

        if (loadedPage.hasMore && loadedPage.nextCursor) {
          pageCursorsRef.current[safePage] = loadedPage.nextCursor;
        } else {
          pageCursorsRef.current = pageCursorsRef.current.slice(0, safePage);
        }
      } catch (error) {
        console.error('Error loading invoices:', error);
        setInvoices([]);
      } finally {
        if (showInitialLoader) {
          setInitialLoading(false);
        } else {
          setListLoading(false);
        }
      }
    },
    [currentYearStartIso],
  );

  useEffect(() => {
    const showInitialLoader = !hasLoadedOnceRef.current;
    hasLoadedOnceRef.current = true;
    loadInvoices({ page: 1, filter: statusFilter, resetCursors: true, showInitialLoader });
  }, [loadInvoices, statusFilter]);

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

  const createInvoiceDisabled = invoicesThisMonth >= invoiceLimit;
  const totalPages = Math.max(1, Math.ceil(totalFilteredInvoices / ITEMS_PER_PAGE));
  const rangeStart = totalFilteredInvoices > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const rangeEnd = rangeStart > 0 ? rangeStart + invoices.length - 1 : 0;

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
    await loadInvoices({ page: currentPage, filter: statusFilter });
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
    loadInvoices({ page: currentPage, filter: statusFilter });
  };

  if (initialLoading) {
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
            All ({totalInvoices})
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

      {listLoading && (
        <div className="mb-4 text-sm text-white/70">Refreshing invoices...</div>
      )}

      {totalFilteredInvoices === 0 ? (
        <div className="glass-dark p-12 text-center rounded-xl">
          <p className="text-xl text-white/70">No invoices yet</p>
          <p className="text-sm text-white/50 mt-2">
            Create your first invoice to get started
          </p>
        </div>
      ) : (
        <div className={listLoading ? 'opacity-70 transition-opacity' : ''}>
          <div className="space-y-3 lg:hidden">
            {invoices.map((invoice) => (
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

          {totalFilteredInvoices > ITEMS_PER_PAGE && (
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-white/80">
                Showing {rangeStart}-{rangeEnd} of {totalFilteredInvoices}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const previousPage = Math.max(1, currentPage - 1);
                    loadInvoices({ page: previousPage, filter: statusFilter });
                  }}
                  disabled={currentPage === 1 || listLoading}
                  className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm font-semibold text-white/90">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (hasNextPage) {
                      loadInvoices({ page: currentPage + 1, filter: statusFilter });
                    }
                  }}
                  disabled={!hasNextPage || listLoading}
                  className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
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
