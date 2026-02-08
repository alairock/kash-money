import { updateInvoice, getCompanySettings } from './billingStorage';
import type { Invoice, Client } from '../types/billing';
import { functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';

// Convert Blob to base64 string
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64Content = base64String.split(',')[1];
      resolve(base64Content);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const sendInvoiceEmail = async (
  invoice: Invoice,
  client: Client,
  emailBody: string,
  pdfBlob: Blob
): Promise<void> => {
  console.log('📧 Sending invoice email via Postmark...');
  console.log('To:', client.email);
  console.log('Subject:', `Invoice ${invoice.invoiceNumber}`);

  try {
    // Get company settings for the "from" email
    const company = await getCompanySettings();
    if (!company?.email) {
      throw new Error('Company email not configured in settings');
    }

    // Convert PDF to base64 for attachment
    const pdfBase64 = await blobToBase64(pdfBlob);

    // Call the cloud function to send email
    // Use verified system email as "from", user's email as "reply-to"
    const sendEmail = httpsCallable(functions, 'sendInvoiceEmail');
    const result = await sendEmail({
      to: client.email,
      from: 'skyler@sixteenink.com', // Verified sender signature
      replyTo: company.email, // User's email for replies
      subject: `Invoice ${invoice.invoiceNumber}`,
      htmlBody: emailBody.replace(/\n/g, '<br>'), // Convert newlines to HTML breaks
      textBody: emailBody, // Plain text version
      pdfBase64: pdfBase64,
      pdfFilename: `${invoice.invoiceNumber}.pdf`,
    });

    console.log('✅ Email sent successfully:', result.data);

    // Update invoice status (only change to 'sent' if currently 'draft')
    await updateInvoice({
      ...invoice,
      status: invoice.status === 'draft' ? 'sent' : invoice.status,
      dateSent: new Date().toISOString(),
    });

    console.log('✅ Invoice status updated');
  } catch (error: unknown) {
    console.error('❌ Error sending email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
    throw new Error(errorMessage);
  }
};

export const getDefaultEmailBody = (
  invoice: Invoice,
  companyName: string
): string => {
  return `Hi ${invoice.clientName},

Please find attached invoice ${invoice.invoiceNumber} for the services provided.

If you have any questions about this invoice, please don't hesitate to reach out.

Thank you for your business!

Best regards,
${companyName}`;
};
