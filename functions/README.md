# Cloud Functions Setup

This directory contains Firebase Cloud Functions for sending invoice emails via Postmark.

## Initial Setup

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Configure Postmark API Token

Get your Postmark Server API Token from: https://account.postmarkapp.com/servers

Then set it as a Firebase secret (using Google Cloud Secret Manager):

```bash
firebase functions:secrets:set POSTMARK_API_TOKEN
```

When prompted, paste your Postmark Server API Token and press Enter.

Alternatively, you can set it directly:

```bash
echo "YOUR_POSTMARK_SERVER_API_TOKEN" | firebase functions:secrets:set POSTMARK_API_TOKEN
```

### 3. Build the Functions

```bash
npm run build
```

## Deployment

Deploy the functions to Firebase:

```bash
npm run deploy
```

Or deploy from the root directory:

```bash
firebase deploy --only functions
```

## Local Testing (Optional)

To test functions locally with the Firebase emulator:

```bash
npm run serve
```

Then update your frontend to point to the local emulator by adding this to `src/config/firebase.ts`:

```typescript
import { connectFunctionsEmulator } from 'firebase/functions';

// After initializing functions
if (import.meta.env.DEV) {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

## Functions

### `sendInvoiceEmail`

**Type:** HTTPS Callable Function
**Purpose:** Sends invoice emails with PDF attachments via Postmark

**Parameters:**
- `to` - Recipient email address
- `from` - Sender email address
- `replyTo` - Reply-to email address
- `subject` - Email subject
- `htmlBody` - HTML version of email body
- `textBody` - Plain text version of email body
- `pdfBase64` - Base64-encoded PDF attachment
- `pdfFilename` - Filename for the PDF attachment

**Returns:**
```typescript
{
  success: boolean;
  messageId: string; // Postmark message ID
}
```

**Authentication:** Required - user must be signed in

## Troubleshooting

### "Postmark API token not configured" error

Make sure you've set the Postmark secret:
```bash
firebase functions:secrets:access POSTMARK_API_TOKEN
```

If not set, create it:
```bash
firebase functions:secrets:set POSTMARK_API_TOKEN
```

### Function not found error

Make sure the function is deployed:
```bash
firebase deploy --only functions
```

### Local development

View function logs:
```bash
firebase functions:log
```

Or in real-time:
```bash
firebase functions:log --follow
```

## Cost Estimate

With the Firebase free tier:
- **2,000,000** invocations/month (free)
- **400,000** GB-seconds compute time (free)
- **200,000** GHz-seconds CPU time (free)

For typical invoice sending (a few per day), you'll stay well within the free tier.

Postmark costs are separate - check their pricing at https://postmarkapp.com/pricing
