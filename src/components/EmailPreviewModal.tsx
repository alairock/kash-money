import { useState } from 'react';
import type { Invoice, Client, CompanySettings } from '../types/billing';
import { getInvoicePDFBlob } from '../utils/pdfGenerator';
import { sendInvoiceEmail, getDefaultEmailBody } from '../utils/emailService';

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
  const [emailBody, setEmailBody] = useState(
    getDefaultEmailBody(invoice, company.companyName)
  );
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const pdfBlob = await getInvoicePDFBlob(invoice, client, company);
      await sendInvoiceEmail(invoice, client, emailBody, pdfBlob);
      onSent();
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    }
    setSending(false);
  };

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
