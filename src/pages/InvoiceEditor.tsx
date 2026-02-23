import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getClients,
  getInvoice,
  getInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getNextInvoiceNumber,
  getCompanySettings,
} from '../utils/billingStorage';
import type { Client, Invoice, InvoiceLineItem } from '../types/billing';
import { formatCurrency } from '../utils/formatCurrency';
import { isPlanLimitError, PLAN_LIMIT_REACHED_TOOLTIP } from '../utils/limits';

export const InvoiceEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [invoice, setInvoice] = useState<Invoice>({
    id: crypto.randomUUID(),
    invoiceNumber: '',
    clientId: '',
    clientName: '',
    clientEmail: '',
    dateCreated: new Date().toISOString(),
    dateDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days
    status: 'draft',
    lineItems: [],
    total: 0,
    notes: '',
    terms: 'Net 30',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const loadedClients = await getClients();
    setClients(loadedClients);

    if (id) {
      // Edit existing invoice
      const existingInvoice = await getInvoice(id);
      if (existingInvoice) {
        setInvoice(existingInvoice);
      }
    } else {
      // Creating new invoice - copy from last invoice if available
      const companySettings = await getCompanySettings();
      const allInvoices = await getInvoices();

      if (allInvoices.length > 0) {
        const lastInvoice = allInvoices[0]; // Already sorted by dateCreated desc

        // Copy line items from last invoice with new IDs
        const copiedLineItems = lastInvoice.lineItems.map((item) => ({
          ...item,
          id: crypto.randomUUID(), // Generate new ID for each line item
        }));

        setInvoice((prev) => ({
          ...prev,
          clientId: lastInvoice.clientId,
          clientName: lastInvoice.clientName,
          clientEmail: lastInvoice.clientEmail,
          lineItems: copiedLineItems,
          total: lastInvoice.total,
          notes:
            lastInvoice.notes || companySettings?.defaultInvoiceNotes || '',
        }));
      } else {
        // No previous invoices, just use default notes
        setInvoice((prev) => ({
          ...prev,
          notes: companySettings?.defaultInvoiceNotes || '',
        }));
      }
    }
    // Don't generate invoice number yet - wait until save

    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setInvoice({
        ...invoice,
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email,
      });
    }
  };

  const calculateDueDate = (dateCreated: string): string => {
    const created = new Date(dateCreated);
    const due = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days
    return due.toISOString();
  };

  const handleDateCreatedChange = (dateCreated: string) => {
    const dateDue = calculateDueDate(dateCreated);
    setInvoice({ ...invoice, dateCreated, dateDue });
  };

  const handleStatusChange = (status: Invoice['status']) => {
    const updatedInvoice: Invoice = { ...invoice, status };

    if (status === 'paid' && !invoice.datePaid) {
      updatedInvoice.datePaid = new Date().toISOString();
    }

    if (status !== 'paid' && invoice.datePaid) {
      delete updatedInvoice.datePaid;
    }

    setInvoice(updatedInvoice);
  };

  const addLineItem = () => {
    const selectedClient = clients.find((c) => c.id === invoice.clientId);
    const newItem: InvoiceLineItem = {
      id: crypto.randomUUID(),
      description: '',
      hours: 0,
      rate: selectedClient?.hourlyRate || 0,
      amount: 0,
    };
    setInvoice({
      ...invoice,
      lineItems: [...invoice.lineItems, newItem],
    });
  };

  const updateLineItem = (id: string, updates: Partial<InvoiceLineItem>) => {
    const updatedLineItems = invoice.lineItems.map((item) => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        // Recalculate amount if hours or rate changed
        if ('hours' in updates || 'rate' in updates) {
          updated.amount = updated.hours * updated.rate;
        }
        return updated;
      }
      return item;
    });

    // Recalculate total
    const total = updatedLineItems.reduce((sum, item) => sum + item.amount, 0);

    setInvoice({
      ...invoice,
      lineItems: updatedLineItems,
      total,
    });
  };

  const deleteLineItem = (id: string) => {
    const updatedLineItems = invoice.lineItems.filter((item) => item.id !== id);
    const total = updatedLineItems.reduce((sum, item) => sum + item.amount, 0);
    setInvoice({
      ...invoice,
      lineItems: updatedLineItems,
      total,
    });
  };

  const handleSave = async (status?: Invoice['status']) => {
    // Validation
    if (!invoice.clientId) {
      alert('Please select a client');
      return;
    }
    if (invoice.lineItems.length === 0) {
      alert('Please add at least one line item');
      return;
    }

    setSaving(true);
    try {
      let invoiceToSave = {
        ...invoice,
        status: status || invoice.status,
      };

      // Generate invoice number only when creating a new invoice
      if (!id) {
        const invoiceNumber = await getNextInvoiceNumber();
        invoiceToSave = {
          ...invoiceToSave,
          invoiceNumber,
        };
      }

      if (id) {
        await updateInvoice(invoiceToSave);
      } else {
        await createInvoice(invoiceToSave);
      }

      navigate('/billing/invoices');
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert(isPlanLimitError(error) ? PLAN_LIMIT_REACHED_TOOLTIP : 'Failed to save invoice');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!id) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete invoice ${invoice.invoiceNumber}? This action cannot be undone.`,
    );

    if (!confirmDelete) return;

    setSaving(true);
    try {
      await deleteInvoice(id);
      navigate('/billing/invoices');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Failed to delete invoice');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-xl text-white/70">Loading...</div>
      </div>
    );
  }

  const isPaid = invoice.status === 'paid';

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">
          {id ? 'Edit Invoice' : 'Create New Invoice'}
          {isPaid && (
            <span className="ml-3 text-sm text-green-400">(Paid - Locked)</span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => navigate('/billing/invoices')}
          className="text-white/70 transition-colors hover:text-white"
        >
          ← Back to Invoices
        </button>
      </div>

      <div className="glass-dark space-y-6 rounded-xl p-4 sm:p-8">
        {/* Invoice Number and Date */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-white/80">
              Invoice Number
            </label>
            <input
              type="text"
              value={invoice.invoiceNumber || 'Auto-generated on save'}
              readOnly
              className="glass-effect w-full cursor-not-allowed rounded-lg px-4 py-2 text-white/50"
              placeholder="Auto-generated on save"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-white/80">
              Invoice Date
            </label>
            <input
              type="date"
              value={invoice.dateCreated.split('T')[0]}
              onChange={(e) =>
                handleDateCreatedChange(new Date(e.target.value).toISOString())
              }
              disabled={isPaid}
              className="glass-effect w-full rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        {/* Client Selection */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-white/80">
            Client *
          </label>
          <select
            value={invoice.clientId}
            onChange={(e) => handleClientChange(e.target.value)}
            disabled={isPaid}
            className="glass-effect w-full rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select a client...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} {client.company ? `(${client.company})` : ''}
              </option>
            ))}
          </select>
          {clients.length === 0 && (
            <p className="mt-2 text-sm text-white/50">
              No clients found. Create a client first in the Clients tab.
            </p>
          )}
        </div>

        {/* Due Date (read-only, auto-calculated) */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-white/80">
            Due Date (Net 30)
          </label>
          <input
            type="date"
            value={invoice.dateDue.split('T')[0]}
            readOnly
            className="glass-effect w-full cursor-not-allowed rounded-lg px-4 py-2 text-white/50"
          />
        </div>

        {!isPaid && (
          <div>
            <label className="mb-2 block text-sm font-semibold text-white/80">
              Status
            </label>
            <select
              value={invoice.status}
              onChange={(e) =>
                handleStatusChange(e.target.value as Invoice['status'])
              }
              className="glass-effect w-full rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        )}

        {/* Line Items */}
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="text-sm font-semibold text-white/80">
              Line Items *
            </label>
            <button
              type="button"
              onClick={addLineItem}
              disabled={!invoice.clientId || isPaid}
              className="gradient-primary w-full rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              ➕ Add Line Item
            </button>
          </div>

          {invoice.lineItems.length === 0 ? (
            <div className="glass-effect rounded-lg p-8 text-center">
              <p className="text-white/50">No line items yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Column Headers */}
              <div className="hidden grid-cols-12 gap-3 px-4 pb-2 sm:grid">
                <div className="col-span-5">
                  <span className="text-xs font-semibold text-white/60 uppercase">
                    Description
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs font-semibold text-white/60 uppercase">
                    Hours
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs font-semibold text-white/60 uppercase">
                    Rate
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs font-semibold text-white/60 uppercase">
                    Amount
                  </span>
                </div>
                <div className="col-span-1"></div>
              </div>

              {invoice.lineItems.map((item) => (
                <div
                  key={item.id}
                  className="glass-effect grid grid-cols-1 gap-3 rounded-lg p-4 sm:grid-cols-12 sm:items-start"
                >
                  <div className="sm:col-span-5">
                    <label className="mb-1 block text-xs font-semibold text-white/60 uppercase sm:hidden">
                      Description
                    </label>
                    <textarea
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(item.id, { description: e.target.value })
                      }
                      disabled={isPaid}
                      placeholder="Description"
                      rows={2}
                      className="glass-effect w-full resize-y rounded px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-white/60 uppercase sm:hidden">
                      Hours
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.hours}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty, numbers, and decimal point
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          updateLineItem(item.id, {
                            hours: value === '' ? 0 : parseFloat(value) || 0,
                          });
                        }
                      }}
                      disabled={isPaid}
                      placeholder="Hours"
                      className="glass-effect w-full rounded px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-white/60 uppercase sm:hidden">
                      Rate
                    </label>
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) =>
                        updateLineItem(item.id, {
                          rate: parseFloat(e.target.value) || 0,
                        })
                      }
                      disabled={isPaid}
                      placeholder="Rate"
                      step="0.01"
                      min="0"
                      className="glass-effect w-full rounded px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="mb-1 block text-xs font-semibold text-white/60 uppercase sm:hidden">
                      Amount
                    </div>
                    <div className="text-left font-mono text-white/80 sm:text-right">
                      {formatCurrency(item.amount)}
                    </div>
                  </div>
                  <div className="text-right sm:col-span-1">
                    {!isPaid && (
                      <button
                        type="button"
                        onClick={() => deleteLineItem(item.id)}
                        className="glass-effect w-full rounded px-3 py-2 text-sm font-semibold text-red-400 transition-colors hover:text-red-300 sm:w-auto sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0"
                        title="Delete line item"
                        aria-label="Delete line item"
                      >
                        <span className="sm:hidden">Remove Line Item</span>
                        <span className="hidden sm:inline">✕</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total */}
        <div className="flex justify-end">
          <div className="text-right">
            <div className="mb-1 text-sm text-white/50">Total</div>
            <div className="text-2xl font-bold text-green-400 sm:text-3xl">
              {formatCurrency(invoice.total)}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-white/80">
            Notes
          </label>
          <textarea
            value={invoice.notes}
            onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })}
            disabled={isPaid}
            placeholder="Additional notes or payment instructions..."
            className="glass-effect w-full rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            rows={4}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            {!isPaid && (
              <button
                type="button"
                onClick={() => handleSave(id ? undefined : 'draft')}
                disabled={saving}
                className="gradient-primary w-full rounded-lg px-6 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {saving ? 'Saving...' : id ? 'Save Changes' : 'Save Draft'}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/billing/invoices')}
              disabled={saving}
              className="glass-effect w-full rounded-lg px-6 py-3 font-semibold text-white/70 transition-all hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Cancel
            </button>
          </div>

          {/* Delete button - only show when editing existing invoice */}
          {id && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="glass-effect w-full rounded-lg px-6 py-3 font-semibold text-red-400 transition-all hover:scale-105 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              🗑️ Delete Invoice
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
