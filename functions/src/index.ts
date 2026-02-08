import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { ServerClient } from 'postmark';
import { defineSecret } from 'firebase-functions/params';

admin.initializeApp();

// Define the secret for Postmark API token
const postmarkToken = defineSecret('POSTMARK_API_TOKEN');

interface SendInvoiceEmailData {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  pdfBase64: string;
  pdfFilename: string;
}

export const sendInvoiceEmail = functions
  .runWith({ secrets: [postmarkToken] })
  .https.onCall(async (data: SendInvoiceEmailData, context) => {
    // Verify the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to send emails.'
      );
    }

    // Validate required fields
    if (!data.to || !data.from || !data.subject || !data.pdfBase64) {
      throw new functions.https.HttpsError(
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

      throw new functions.https.HttpsError(
        'internal',
        `Failed to send email: ${errorMessage}`
      );
    }
  }
);
