import { useState, useEffect } from 'react';
import {
  getCompanySettings,
  updateCompanySettings,
  getInvoiceCounter,
  updateInvoiceCounter,
} from '../utils/billingStorage';
import type { CompanySettings } from '../types/billing';

export const BillingSettings = () => {
  const [settings, setSettings] = useState<CompanySettings>({
    id: 'default',
    companyName: '',
    email: '',
    phone: '',
    address: '',
    website: '',
  });
  const [invoiceCounter, setInvoiceCounter] = useState<{
    year: number;
    count: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [savingCounter, setSavingCounter] = useState(false);
  const [counterMessage, setCounterMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const existingSettings = await getCompanySettings();
    if (existingSettings) {
      setSettings(existingSettings);
    }
    const counter = await getInvoiceCounter();
    if (counter) {
      setInvoiceCounter(counter);
    } else {
      // Default to current year, count 0
      setInvoiceCounter({ year: new Date().getFullYear(), count: 0 });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings.companyName || !settings.email) {
      setSaveMessage('Company name and email are required');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setSaving(true);
    try {
      await updateCompanySettings(settings);
      setSaveMessage('✅ Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('❌ Failed to save settings');
      setTimeout(() => setSaveMessage(''), 3000);
    }
    setSaving(false);
  };

  const handleSaveCounter = async () => {
    if (!invoiceCounter) return;

    if (invoiceCounter.count < 0) {
      setCounterMessage('❌ Invoice number must be 0 or greater');
      setTimeout(() => setCounterMessage(''), 3000);
      return;
    }

    setSavingCounter(true);
    try {
      await updateInvoiceCounter(invoiceCounter.year, invoiceCounter.count);
      setCounterMessage('✅ Invoice counter updated!');
      setTimeout(() => setCounterMessage(''), 3000);
    } catch (error) {
      setCounterMessage('❌ Failed to update counter');
      setTimeout(() => setCounterMessage(''), 3000);
    }
    setSavingCounter(false);
  };

  const formatInvoiceNumber = (year: number, count: number) => {
    const paddedCount = count.toString().padStart(4, '0');
    return `INV-${year}-${paddedCount}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-xl text-white/70">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="glass-dark p-8 rounded-xl">
        <h2 className="text-2xl font-bold mb-6">Company Information</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              className="w-full rounded-lg glass-effect px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your Company Name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              className="w-full rounded-lg glass-effect px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={settings.phone}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              className="w-full rounded-lg glass-effect px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">
              Address
            </label>
            <textarea
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full rounded-lg glass-effect px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123 Main St&#10;City, State 12345"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">
              Website
            </label>
            <input
              type="url"
              value={settings.website}
              onChange={(e) => setSettings({ ...settings, website: e.target.value })}
              className="w-full rounded-lg glass-effect px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://yourwebsite.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">
              Default Invoice Notes
            </label>
            <p className="text-sm text-white/50 mb-2">
              These notes will be automatically added to new invoices
            </p>
            <textarea
              value={settings.defaultInvoiceNotes || ''}
              onChange={(e) => setSettings({ ...settings, defaultInvoiceNotes: e.target.value })}
              className="w-full rounded-lg glass-effect px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Payment terms, bank details, thank you message, etc."
              rows={4}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="gradient-primary rounded-lg px-6 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saveMessage && (
            <span className="text-sm font-semibold">{saveMessage}</span>
          )}
        </div>
      </div>

      {/* Invoice Numbering Section */}
      <div className="glass-dark p-8 rounded-xl">
        <h2 className="text-2xl font-bold mb-6">Invoice Numbering</h2>

        {invoiceCounter && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg glass-effect">
              <div className="text-sm text-white/70 mb-1">Last Invoice Number</div>
              <div className="text-2xl font-bold text-green-400">
                {formatInvoiceNumber(invoiceCounter.year, invoiceCounter.count)}
              </div>
            </div>

            <div className="p-4 rounded-lg glass-effect">
              <div className="text-sm text-white/70 mb-1">Next Invoice Number</div>
              <div className="text-xl font-semibold text-blue-400">
                {formatInvoiceNumber(invoiceCounter.year, invoiceCounter.count + 1)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/80 mb-2">
                Set Starting Number
              </label>
              <p className="text-sm text-white/50 mb-3">
                The next new invoice will use this number + 1. Current: {invoiceCounter.count}
              </p>
              <input
                type="number"
                value={invoiceCounter.count}
                onChange={(e) =>
                  setInvoiceCounter({
                    ...invoiceCounter,
                    count: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full rounded-lg glass-effect px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                min="0"
              />
            </div>

            <div className="mt-6 flex items-center gap-4">
              <button
                type="button"
                onClick={handleSaveCounter}
                disabled={savingCounter}
                className="gradient-primary rounded-lg px-6 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingCounter ? 'Saving...' : 'Update Invoice Counter'}
              </button>
              {counterMessage && (
                <span className="text-sm font-semibold">{counterMessage}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
