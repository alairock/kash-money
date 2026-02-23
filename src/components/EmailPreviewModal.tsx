import { useState } from 'react';
import type { Invoice, Client, CompanySettings } from '../types/billing';
import { getInvoicePDFBlob } from '../utils/pdfGenerator';
import { sendInvoiceEmail, getDefaultEmailBody } from '../utils/emailService';
import { updateClient } from '../utils/billingStorage';

interface EmailPreviewModalProps {
  invoice: Invoice;
  client: Client;
  company: CompanySettings;
  onClose: () => void;
  onSent: () => void;
}

export const EmailPreviewModal = ({
  invoice,
  client,
  company,
  onClose,
  onSent,
}: EmailPreviewModalProps) => {
  const maxCcRecipients = 3;
  const defaultCcEmail = company.email.trim();
  const maxAdditionalCcRecipients = defaultCcEmail ? maxCcRecipients - 1 : maxCcRecipients;
  const emailRegex = /\S+@\S+\.\S+/;
  const [emailBody, setEmailBody] = useState(
    () => getDefaultEmailBody(invoice, company.companyName)
  );
  const [editingCc, setEditingCc] = useState(false);
  const [additionalCcEntries, setAdditionalCcEntries] = useState(() => {
    const unique = new Set<string>();
    for (const email of client.invoiceCcEmails || []) {
      const trimmed = email.trim();
      if (!trimmed) {
        continue;
      }
      if (defaultCcEmail && trimmed.toLowerCase() === defaultCcEmail.toLowerCase()) {
        continue;
      }
      unique.add(trimmed);
    }
    return Array.from(unique)
      .slice(0, maxAdditionalCcRecipients)
      .map((email) => ({
        id: crypto.randomUUID(),
        email,
      }));
  });
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const cleanedAdditionalCc = additionalCcEntries
      .map((entry) => entry.email.trim())
      .filter((email) => email.length > 0);

    for (const email of cleanedAdditionalCc) {
      if (!emailRegex.test(email)) {
        alert(`Please enter a valid CC email address: ${email}`);
        return;
      }
    }

    const filteredAdditionalCc = cleanedAdditionalCc.filter(
      (email) =>
        !defaultCcEmail || email.toLowerCase() !== defaultCcEmail.toLowerCase()
    );

    const uniqueAdditionalCc = Array.from(
      new Set(filteredAdditionalCc.map((email) => email.toLowerCase()))
    ).slice(0, maxAdditionalCcRecipients);

    const ccRecipients = defaultCcEmail
      ? [defaultCcEmail, ...uniqueAdditionalCc]
      : uniqueAdditionalCc;

    if (ccRecipients.length > maxCcRecipients) {
      alert(`You can CC up to ${maxCcRecipients} people`);
      return;
    }

    setSending(true);
    try {
      const pdfBlob = await getInvoicePDFBlob(invoice, client, company);

      const previousAdditionalCc = (client.invoiceCcEmails || [])
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email.length > 0)
        .sort()
        .join(',');
      const nextAdditionalCc = uniqueAdditionalCc
        .map((email) => email.trim().toLowerCase())
        .sort()
        .join(',');

      if (previousAdditionalCc !== nextAdditionalCc) {
        await updateClient({
          ...client,
          invoiceCcEmails: uniqueAdditionalCc,
        });
      }

      await sendInvoiceEmail(invoice, client, emailBody, pdfBlob, ccRecipients);
      onSent();
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    }
    setSending(false);
  };

  const displayedCcRecipients = Array.from(
    new Set([
      ...(defaultCcEmail ? [defaultCcEmail.toLowerCase()] : []),
      ...additionalCcEntries
        .map((entry) => entry.email.trim().toLowerCase())
        .filter((email) => email.length > 0),
    ])
  ).slice(0, maxCcRecipients);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-dark rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold">Send Invoice</h2>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">To:</label>
            <input
              type="email"
              value={client.email}
              readOnly
              className="w-full rounded-lg glass-effect px-4 py-2 text-white/50 cursor-not-allowed"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-semibold text-white/80">
                CC:
              </label>
              <button
                type="button"
                onClick={() => setEditingCc((prev) => !prev)}
                className="text-xs font-semibold text-blue-300 hover:text-blue-200"
              >
                {editingCc ? 'Done' : 'Edit'}
              </button>
            </div>
            {displayedCcRecipients.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {displayedCcRecipients.map((email) => (
                  <span key={email} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                    {email}
                    {defaultCcEmail && email.toLowerCase() === defaultCcEmail.toLowerCase()
                      ? ' (default)'
                      : ''}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mb-2 text-sm text-white/50">No CC recipients set</p>
            )}

            {editingCc && (
              <div className="space-y-2 rounded-lg border border-white/10 p-3">
                {defaultCcEmail && (
                  <div className="text-xs text-white/60">
                    Account holder email ({defaultCcEmail}) is always included.
                  </div>
                )}

                {additionalCcEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-2">
                    <input
                      type="email"
                      value={entry.email}
                      onChange={(e) => {
                        setAdditionalCcEntries(
                          additionalCcEntries.map((item) =>
                            item.id === entry.id
                              ? { ...item, email: e.target.value }
                              : item
                          )
                        );
                      }}
                      className="w-full rounded-lg glass-effect px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="name@company.com"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setAdditionalCcEntries(
                          additionalCcEntries.filter((item) => item.id !== entry.id)
                        )
                      }
                      className="rounded glass-effect px-2 py-2 text-xs font-semibold text-red-300 hover:text-red-200"
                      title="Remove CC"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {additionalCcEntries.length < maxAdditionalCcRecipients && (
                  <button
                    type="button"
                    onClick={() =>
                      setAdditionalCcEntries([
                        ...additionalCcEntries,
                        { id: crypto.randomUUID(), email: '' },
                      ])
                    }
                    className="rounded glass-effect px-3 py-2 text-xs font-semibold text-blue-300 hover:text-blue-200"
                  >
                    + Add CC
                  </button>
                )}

                <p className="text-xs text-white/50">
                  Up to {maxCcRecipients} total CC recipients.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">
              Subject:
            </label>
            <input
              type="text"
              value={`Invoice ${invoice.invoiceNumber} from ${company.companyName}`}
              readOnly
              className="w-full rounded-lg glass-effect px-4 py-2 text-white/50 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">
              Message:
            </label>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              className="w-full rounded-lg glass-effect px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={12}
            />
          </div>

          <div className="glass-effect p-3 rounded-lg">
            <div className="text-sm text-white/70">
              📎 Attachment: {invoice.invoiceNumber}.pdf
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/10 flex gap-4 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-lg glass-effect px-6 py-3 font-semibold text-white/70 transition-all hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="gradient-primary rounded-lg px-6 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : '📧 Send Now'}
          </button>
        </div>
      </div>
    </div>
  );
};
