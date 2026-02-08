import { useState, useEffect } from 'react';
import { getClients, createClient, updateClient, deleteClient } from '../utils/billingStorage';
import type { Client } from '../types/billing';
import { formatCurrency } from '../utils/formatCurrency';

export const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    const loadedClients = await getClients();
    setClients(loadedClients);
    setLoading(false);
  };

  const handleAddClient = async () => {
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

    await createClient(newClient);
    setClients([...clients, newClient]);
    setEditingClient(newClient);
    setNewlyCreatedId(newClient.id);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient({ ...client }); // Create a copy for editing
  };

  const handleUpdateEditingClient = (updates: Partial<Client>) => {
    if (editingClient) {
      setEditingClient({ ...editingClient, ...updates });
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (confirm('Are you sure you want to delete this client?')) {
      await deleteClient(id);
      setClients(clients.filter((c) => c.id !== id));
    }
  };

  const handleCancelEdit = async () => {
    if (editingClient && editingClient.id === newlyCreatedId) {
      await deleteClient(editingClient.id);
      setClients(clients.filter((c) => c.id !== editingClient.id));
      setNewlyCreatedId(null);
    }
    setEditingClient(null);
  };

  const handleSaveEdit = async () => {
    if (!editingClient) return;

    // Validation
    if (!editingClient.name || !editingClient.email) {
      alert('Name and email are required');
      return;
    }
    if (editingClient.hourlyRate < 0) {
      alert('Hourly rate must be a positive number');
      return;
    }

    // Save to Firestore
    await updateClient(editingClient);

    // Update local state
    setClients(clients.map((c) => (c.id === editingClient.id ? editingClient : c)));

    setNewlyCreatedId(null);
    setEditingClient(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-xl text-white/70">Loading clients...</div>
      </div>
    );
  }

  // Show edit form when editing a client
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

  // Show clients list
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Clients</h2>
        <button
          type="button"
          onClick={handleAddClient}
          className="gradient-primary rounded-lg px-6 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105"
        >
          ➕ Add Client
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="glass-dark p-12 text-center rounded-xl">
          <p className="text-xl text-white/70">No clients yet</p>
          <p className="text-sm text-white/50 mt-2">
            Add your first client to start creating invoices
          </p>
        </div>
      ) : (
        <div className="glass-dark rounded-xl overflow-hidden">
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
      )}
    </div>
  );
};
