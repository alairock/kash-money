import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getClientsPage,
  getClientsCount,
  createClient,
  updateClient,
  deleteClient,
  type ClientsPageCursor,
} from '../utils/billingStorage';
import type { Client } from '../types/billing';
import { formatCurrency } from '../utils/formatCurrency';
import { getCurrentUserLimits } from '../utils/superAdminStorage';
import { isPlanLimitError, PLAN_LIMIT_REACHED_TOOLTIP } from '../utils/limits';
import { Tooltip } from '../components/Tooltip';

const ITEMS_PER_PAGE = 3;

export const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientLimit, setClientLimit] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalClients, setTotalClients] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);

  const pageCursorsRef = useRef<ClientsPageCursor[]>([null]);

  const loadClients = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const [loadedTotalClients, limits] = await Promise.all([getClientsCount(), getCurrentUserLimits()]);
      const safePage = Math.min(page, Math.max(1, Math.ceil(loadedTotalClients / ITEMS_PER_PAGE)));
      const pageCursor = pageCursorsRef.current[safePage - 1] ?? null;
      const loadedPage = await getClientsPage({
        pageSize: ITEMS_PER_PAGE,
        cursor: pageCursor,
      });

      setClients(loadedPage.clients);
      setHasNextPage(loadedPage.hasMore);
      setCurrentPage(safePage);
      setTotalClients(loadedTotalClients);
      setClientLimit(limits.clients);

      if (loadedPage.hasMore && loadedPage.nextCursor) {
        pageCursorsRef.current[safePage] = loadedPage.nextCursor;
      } else {
        pageCursorsRef.current = pageCursorsRef.current.slice(0, safePage);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const addClientDisabled = totalClients >= clientLimit;
  const totalPages = Math.max(1, Math.ceil(totalClients / ITEMS_PER_PAGE));
  const rangeStart = totalClients > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const rangeEnd = rangeStart > 0 ? rangeStart + clients.length - 1 : 0;

  const handleAddClient = async () => {
    if (addClientDisabled) {
      alert(PLAN_LIMIT_REACHED_TOOLTIP);
      return;
    }

    const newClient: Client = {
      id: crypto.randomUUID(),
      name: '',
      email: '',
      company: '',
      hourlyRate: 0,
      phone: '',
      address: '',
      dateCreated: new Date().toISOString(),
    };

    try {
      await createClient(newClient);
      setEditingClient(newClient);
      setNewlyCreatedId(newClient.id);
      setTotalClients((previous) => previous + 1);
    } catch (error) {
      if (isPlanLimitError(error)) {
        alert(PLAN_LIMIT_REACHED_TOOLTIP);
        return;
      }

      console.error('Error creating client:', error);
      alert('Failed to create client');
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient({ ...client });
  };

  const handleUpdateEditingClient = (updates: Partial<Client>) => {
    if (editingClient) {
      setEditingClient({ ...editingClient, ...updates });
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (confirm('Are you sure you want to delete this client?')) {
      await deleteClient(id);
      const nextTotal = Math.max(0, totalClients - 1);
      const nextPage = Math.min(currentPage, Math.max(1, Math.ceil(nextTotal / ITEMS_PER_PAGE)));
      if (nextPage === 1) {
        pageCursorsRef.current = [null];
      }
      await loadClients(nextPage);
    }
  };

  const handleCancelEdit = async () => {
    if (editingClient && editingClient.id === newlyCreatedId) {
      await deleteClient(editingClient.id);
      setNewlyCreatedId(null);
      setTotalClients((previous) => Math.max(0, previous - 1));
      if (currentPage === 1) {
        pageCursorsRef.current = [null];
      }
      await loadClients(currentPage);
    }
    setEditingClient(null);
  };

  const handleSaveEdit = async () => {
    if (!editingClient) return;

    if (!editingClient.name || !editingClient.email) {
      alert('Name and email are required');
      return;
    }
    if (editingClient.hourlyRate < 0) {
      alert('Hourly rate must be a positive number');
      return;
    }

    await updateClient(editingClient);

    setNewlyCreatedId(null);
    setEditingClient(null);
    if (currentPage === 1) {
      pageCursorsRef.current = [null];
    }
    await loadClients(currentPage);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-xl text-white/70">Loading clients...</div>
      </div>
    );
  }

  if (editingClient) {
    return (
      <div className="max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {editingClient.id === newlyCreatedId ? 'Add New Client' : 'Edit Client'}
          </h2>
          <button
            type="button"
            onClick={handleCancelEdit}
            className="text-white/70 hover:text-white transition-colors"
          >
            ← Back to Clients
          </button>
        </div>

        <div className="glass-dark p-8 rounded-xl space-y-6">
          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={editingClient.name}
              onChange={(e) => handleUpdateEditingClient({ name: e.target.value })}
              className="w-full rounded-lg glass-effect px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Client name"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={editingClient.email}
              onChange={(e) => handleUpdateEditingClient({ email: e.target.value })}
              className="w-full rounded-lg glass-effect px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">
              Company
            </label>
            <input
              type="text"
              value={editingClient.company || ''}
              onChange={(e) => handleUpdateEditingClient({ company: e.target.value })}
              className="w-full rounded-lg glass-effect px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Company name"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">
              Hourly Rate *
            </label>
            <input
              type="number"
              value={editingClient.hourlyRate}
              onChange={(e) =>
                handleUpdateEditingClient({
                  hourlyRate: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full rounded-lg glass-effect px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={editingClient.phone || ''}
              onChange={(e) => handleUpdateEditingClient({ phone: e.target.value })}
              className="w-full rounded-lg glass-effect px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">
              Address
            </label>
            <textarea
              value={editingClient.address || ''}
              onChange={(e) => handleUpdateEditingClient({ address: e.target.value })}
              className="w-full rounded-lg glass-effect px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Street address&#10;City, State ZIP"
              rows={3}
            />
          </div>

          <div className="flex gap-4 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={handleSaveEdit}
              className="gradient-primary rounded-lg px-6 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105"
            >
              Save Client
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="rounded-lg glass-effect px-6 py-3 font-semibold text-white/70 transition-all hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Clients</h2>
        <Tooltip content={addClientDisabled ? PLAN_LIMIT_REACHED_TOOLTIP : ''}>
          <div>
            <button
              type="button"
              onClick={handleAddClient}
              disabled={addClientDisabled}
              className="gradient-primary rounded-lg px-6 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-60 disabled:hover:scale-100"
            >
              ➕ Add Client
            </button>
          </div>
        </Tooltip>
      </div>

      {totalClients === 0 ? (
        <div className="glass-dark p-12 text-center rounded-xl">
          <p className="text-xl text-white/70">No clients yet</p>
          <p className="text-sm text-white/50 mt-2">
            Add your first client to start creating invoices
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {clients.map((client) => (
              <div key={client.id} className="glass-dark rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{client.name || '—'}</p>
                    <p className="text-xs text-white/70">{client.email || '—'}</p>
                  </div>
                  <span className="font-mono text-sm text-green-400">
                    {formatCurrency(client.hourlyRate)}/hr
                  </span>
                </div>

                <div className="mt-3 text-sm text-white/70">
                  <span className="text-white/50">Company: </span>
                  {client.company || '—'}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditClient(client)}
                    className="rounded glass-effect px-3 py-1 text-sm font-semibold text-white/70 transition-all hover:text-white"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClient(client.id)}
                    className="rounded glass-effect px-3 py-1 text-sm font-semibold text-red-400 transition-all hover:text-red-300"
                  >
                    Delete
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
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Company
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Hourly Rate
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white/80">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-semibold">{client.name || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white/70">{client.email || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white/70">{client.company || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono">{formatCurrency(client.hourlyRate)}/hr</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditClient(client)}
                          className="rounded glass-effect px-3 py-1 text-sm font-semibold text-white/70 transition-all hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClient(client.id)}
                          className="rounded glass-effect px-3 py-1 text-sm font-semibold text-red-400 transition-all hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalClients > ITEMS_PER_PAGE && (
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-white/80">
                Showing {rangeStart}-{rangeEnd} of {totalClients}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const previousPage = Math.max(1, currentPage - 1);
                    loadClients(previousPage);
                  }}
                  disabled={currentPage === 1}
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
                      loadClients(currentPage + 1);
                    }
                  }}
                  disabled={!hasNextPage}
                  className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
