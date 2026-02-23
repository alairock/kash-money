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

type PlanName = 'Free' | 'Basic' | 'Pro' | 'Advanced';

interface UserLimits {
  plan: PlanName;
  clients: number;
  invoicesPerMonth: number;
  budgetsPerMonth: number;
  recurringTemplates: number;
}

interface SuperAdminClient {
  uid: string;
  email: string;
  displayName?: string;
  limits: UserLimits;
  usage: {
    clients: number;
    invoicesThisMonth: number;
    budgetsThisMonth: number;
    recurringTemplates: number;
  };
}

const SUPER_ADMIN_EMAILS = new Set(['sblnog@gmail.com']);

const DEFAULT_LIMITS_BY_PLAN: Record<PlanName, UserLimits> = {
  Free: {
    plan: 'Free',
    clients: 1,
    invoicesPerMonth: 2,
    budgetsPerMonth: 1,
    recurringTemplates: 5,
  },
  Basic: {
    plan: 'Basic',
    clients: 5,
    invoicesPerMonth: 10,
    budgetsPerMonth: 5,
    recurringTemplates: 25,
  },
  Pro: {
    plan: 'Pro',
    clients: 50,
    invoicesPerMonth: 100,
    budgetsPerMonth: 20,
    recurringTemplates: 100,
  },
  Advanced: {
    plan: 'Advanced',
    clients: 1000,
    invoicesPerMonth: 1000,
    budgetsPerMonth: 100,
    recurringTemplates: 1000,
  },
};

const parseDateValue = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
};

const assertSuperAdmin = (
  request: { auth?: { token?: { email?: string } } } | { auth?: null }
) => {
  const email = request.auth?.token?.email?.toLowerCase();
  if (!email || !SUPER_ADMIN_EMAILS.has(email)) {
    throw new HttpsError('permission-denied', 'Super admin access required.');
  }
};

const getEffectiveLimits = (override: Partial<UserLimits> | undefined): UserLimits => {
  const plan = override?.plan ?? 'Free';
  const defaults = DEFAULT_LIMITS_BY_PLAN[plan];
  return {
    plan,
    clients: override?.clients ?? defaults.clients,
    invoicesPerMonth: override?.invoicesPerMonth ?? defaults.invoicesPerMonth,
    budgetsPerMonth: override?.budgetsPerMonth ?? defaults.budgetsPerMonth,
    recurringTemplates: override?.recurringTemplates ?? defaults.recurringTemplates,
  };
};

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

export const superAdminAccessPing = onCall(async (request) => {
  assertSuperAdmin(request);
  return { ok: true };
});

export const getSuperAdminClients = onCall(async (request) => {
  assertSuperAdmin(request);

  const authApi = admin.auth();
  const firestore = admin.firestore();
  const users: admin.auth.UserRecord[] = [];
  let nextPageToken: string | undefined;

  do {
    const page = await authApi.listUsers(1000, nextPageToken);
    users.push(...page.users);
    nextPageToken = page.pageToken;
  } while (nextPageToken);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const clients: SuperAdminClient[] = await Promise.all(
    users.map(async (userRecord) => {
      const uid = userRecord.uid;
      const [clientsSnap, invoicesSnap, budgetsSnap, recurringSnap, limitsSnap] = await Promise.all([
        firestore.collection('users').doc(uid).collection('clients').get(),
        firestore.collection('users').doc(uid).collection('invoices').get(),
        firestore.collection('users').doc(uid).collection('budgets').get(),
        firestore.collection('users').doc(uid).collection('recurringExpenses').get(),
        firestore.collection('users').doc(uid).collection('settings').doc('limits').get(),
      ]);

      const invoicesThisMonth = invoicesSnap.docs.filter((docSnapshot) => {
        const createdDate = parseDateValue(docSnapshot.data().dateCreated);
        return !!createdDate && createdDate >= monthStart && createdDate < nextMonthStart;
      }).length;

      const budgetsThisMonth = budgetsSnap.docs.filter((docSnapshot) => {
        const createdDate = parseDateValue(docSnapshot.data().dateCreated);
        return !!createdDate && createdDate >= monthStart && createdDate < nextMonthStart;
      }).length;

      const overrideData = limitsSnap.exists
        ? (limitsSnap.data() as Partial<UserLimits> | undefined)
        : undefined;

      return {
        uid,
        email: userRecord.email ?? '(no email)',
        displayName: userRecord.displayName ?? '',
        limits: getEffectiveLimits(overrideData),
        usage: {
          clients: clientsSnap.size,
          invoicesThisMonth,
          budgetsThisMonth,
          recurringTemplates: recurringSnap.size,
        },
      };
    })
  );

  clients.sort((a, b) => a.email.localeCompare(b.email));

  return { clients };
});

export const getSuperAdminDashboardStats = onCall(async (request) => {
  assertSuperAdmin(request);

  const authApi = admin.auth();
  const users: admin.auth.UserRecord[] = [];
  let nextPageToken: string | undefined;

  do {
    const page = await authApi.listUsers(1000, nextPageToken);
    users.push(...page.users);
    nextPageToken = page.pageToken;
  } while (nextPageToken);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let loggedInToday = 0;
  let loggedInThisWeek = 0;
  let loggedInThisMonth = 0;

  for (const user of users) {
    if (!user.metadata.lastSignInTime) {
      continue;
    }

    const lastSignIn = new Date(user.metadata.lastSignInTime);
    if (Number.isNaN(lastSignIn.getTime())) {
      continue;
    }

    if (lastSignIn >= startOfToday) {
      loggedInToday += 1;
    }
    if (lastSignIn >= startOfWeek) {
      loggedInThisWeek += 1;
    }
    if (lastSignIn >= startOfMonth) {
      loggedInThisMonth += 1;
    }
  }

  return {
    totalUsers: users.length,
    loggedInToday,
    loggedInThisWeek,
    loggedInThisMonth,
  };
});

export const updateSuperAdminClientLimits = onCall(async (request) => {
  assertSuperAdmin(request);

  const payload = request.data as { uid?: string; limits?: Partial<UserLimits> };
  if (!payload.uid || !payload.limits || !payload.limits.plan) {
    throw new HttpsError('invalid-argument', 'uid and full limits payload are required.');
  }

  const limits = getEffectiveLimits(payload.limits);

  const numberFields: Array<keyof Omit<UserLimits, 'plan'>> = [
    'clients',
    'invoicesPerMonth',
    'budgetsPerMonth',
    'recurringTemplates',
  ];

  for (const field of numberFields) {
    const value = limits[field];
    if (!Number.isFinite(value) || value < 0) {
      throw new HttpsError('invalid-argument', `Invalid value for ${field}.`);
    }
  }

  await admin
    .firestore()
    .collection('users')
    .doc(payload.uid)
    .collection('settings')
    .doc('limits')
    .set(
      {
        ...limits,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  return { success: true };
});
