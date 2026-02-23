import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ServerClient } from 'postmark';

admin.initializeApp();

// Define the secret for Postmark API token
const postmarkToken = defineSecret('POSTMARK_API_TOKEN');

interface SendInvoiceEmailData {
  to: string;
  cc?: string[];
  from: string;
  replyTo: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  pdfBase64: string;
  pdfFilename: string;
}

export const sendInvoiceEmail = onCall(
  { secrets: [postmarkToken] },
  async (request) => {
    // Verify the user is authenticated
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated to send emails.'
      );
    }

    const data = request.data as SendInvoiceEmailData;

    // Validate required fields
    if (!data.to || !data.from || !data.subject || !data.pdfBase64) {
      throw new HttpsError(
        'invalid-argument',
        'Missing required email fields.'
      );
    }

    try {
      // Initialize Postmark client with the secret
      const client = new ServerClient(postmarkToken.value());

      // Send email with PDF attachment
      const result = await client.sendEmail({
        From: data.from,
        To: data.to,
        Cc: data.cc && data.cc.length > 0 ? data.cc.join(',') : undefined,
        ReplyTo: data.replyTo || data.from,
        Subject: data.subject,
        HtmlBody: data.htmlBody,
        TextBody: data.textBody,
        Attachments: [
          {
            Name: data.pdfFilename,
            Content: data.pdfBase64,
            ContentType: 'application/pdf',
            ContentID: '',
          },
        ],
      });

      console.log('Email sent successfully:', result.MessageID);

      return {
        success: true,
        messageId: result.MessageID,
      };
    } catch (error: unknown) {
      console.error('Error sending email:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      throw new HttpsError(
        'internal',
        `Failed to send email: ${errorMessage}`
      );
    }
  }
);
