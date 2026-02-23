#!/usr/bin/env node

/* eslint-disable no-console */
const crypto = require('node:crypto');
const path = require('node:path');

const admin = require(path.join(
  __dirname,
  '..',
  'functions',
  'node_modules',
  'firebase-admin',
));

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'kashmoney-9f3c2';
const DEFAULT_EMAIL = 'notskylewis@gmail.com';

const BUDGET_COUNT = 25;
const RECURRING_COUNT = 30;
const CLIENT_COUNT = 6;
const INVOICE_COUNT = 25;

const args = process.argv.slice(2);
const getArgValue = (name) => {
  const index = args.findIndex((arg) => arg === name);
  if (index === -1) return null;
  return args[index + 1] || null;
};

const userEmail = getArgValue('--email') || DEFAULT_EMAIL;

const clientTemplates = [
  {
    name: 'Maya Rodriguez',
    company: 'Northstar HealthTech',
    email: 'ap@northstarhealthtech.com',
    hourlyRate: 165,
    phone: '+1 (415) 555-1001',
    address: '410 Market St\nSan Francisco, CA 94111',
    cc: ['maya.rodriguez@northstarhealthtech.com'],
  },
  {
    name: 'Daniel Kim',
    company: 'Cloud Harbor Labs',
    email: 'billing@cloudharborlabs.com',
    hourlyRate: 175,
    phone: '+1 (206) 555-1002',
    address: '1550 Westlake Ave N\nSeattle, WA 98109',
    cc: ['finance@cloudharborlabs.com'],
  },
  {
    name: 'Priya Patel',
    company: 'Vertex Commerce',
    email: 'accounts@vertexcommerce.co',
    hourlyRate: 160,
    phone: '+1 (512) 555-1003',
    address: '2201 E 5th St\nAustin, TX 78702',
    cc: ['priya.patel@vertexcommerce.co'],
  },
  {
    name: 'Ethan Brooks',
    company: 'Summit Analytics',
    email: 'billing@summitanalytics.io',
    hourlyRate: 170,
    phone: '+1 (303) 555-1004',
    address: '1700 Lincoln St\nDenver, CO 80203',
    cc: ['ops@summitanalytics.io'],
  },
  {
    name: 'Olivia Chen',
    company: 'Aster Legal Systems',
    email: 'invoices@asterlegal.com',
    hourlyRate: 180,
    phone: '+1 (312) 555-1005',
    address: '325 N LaSalle Dr\nChicago, IL 60654',
    cc: ['olivia.chen@asterlegal.com'],
  },
  {
    name: 'Marcus Johnson',
    company: 'Blue Delta Logistics',
    email: 'payables@bluedeltalogistics.com',
    hourlyRate: 155,
    phone: '+1 (404) 555-1006',
    address: '100 Peachtree St NW\nAtlanta, GA 30303',
    cc: ['marcus.johnson@bluedeltalogistics.com'],
  },
];

const recurringTemplates = [
  ['AWS (prod infra)', 920],
  ['AWS (staging infra)', 210],
  ['Vercel Pro Team', 80],
  ['Cloudflare Pro + WAF', 35],
  ['Datadog APM', 140],
  ['Sentry Team Plan', 52],
  ['Linear Team', 14],
  ['GitHub Team', 48],
  ['1Password Families', 20],
  ['Notion Plus', 24],
  ['Slack Pro', 56],
  ['OpenAI API credit', 180],
  ['Google Workspace', 24],
  ['Loom Business', 15],
  ['Figma Professional', 15],
  ['QuickBooks Online', 65],
  ['Gusto Payroll', 50],
  ['Zoom Pro', 16],
  ['Domain renewals reserve', 30],
  ['SSL certificates reserve', 18],
  ['Error monitoring reserve', 40],
  ['Backup storage (Backblaze)', 22],
  ['Dev laptop replacement reserve', 180],
  ['Coworking membership', 325],
  ['Phone and data plan', 95],
  ['Home office internet', 89],
  ['Professional liability insurance', 110],
  ['Health insurance reserve', 720],
  ['Quarterly tax reserve transfer', 1800],
  ['Continuing education budget', 125],
];

const invoiceTaskPool = [
  ['Backend API endpoint development', [4, 9]],
  ['GraphQL schema design + resolvers', [3, 7]],
  ['React feature implementation', [4, 10]],
  ['TypeScript refactor + strictness cleanup', [3, 8]],
  ['Test suite expansion (unit/integration)', [3, 8]],
  ['Production bug triage and fixes', [2, 6]],
  ['CI/CD pipeline hardening', [2, 5]],
  ['Database query optimization', [2, 6]],
  ['Authentication/permissions updates', [2, 6]],
  ['Observability dashboard setup', [2, 5]],
  ['Incident postmortem + remediations', [1, 4]],
  ['Architecture planning and design review', [2, 5]],
  ['Technical stakeholder sync + planning', [1, 3]],
  ['Security patching and dependency updates', [1, 4]],
  ['Deployment automation scripts', [2, 6]],
  ['API documentation and handoff notes', [1, 3]],
];

const budgetCategoryPool = [
  'Infrastructure',
  'Tools & SaaS',
  'Operations',
  'Insurance',
  'Taxes',
  'Professional Development',
  'Office',
];

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => Math.random() * (max - min) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const isoDate = (d) => new Date(d).toISOString();
const toStartOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const clampDateToNow = (d, now) => (d > now ? new Date(now) : d);
const formatBudgetDateName = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toInvoiceNumber = (year, count) => `INV-${year}-${String(count).padStart(4, '0')}`;
const randomRecentDate = (start, end) => {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return new Date(randomInt(startTime, endTime));
};

const buildRecurringDocs = () => {
  return recurringTemplates.slice(0, RECURRING_COUNT).map(([name, amount], order) => ({
    id: crypto.randomUUID(),
    data: {
      name,
      amount,
      link: `https://example.com/vendors/${encodeURIComponent(name.toLowerCase().replaceAll(' ', '-'))}`,
      note: `${pick(budgetCategoryPool)} recurring template`,
      isAutomatic: Math.random() > 0.55,
      order,
    },
  }));
};

const buildBudgetLineItems = (recurringDocs) => {
  const selectedCount = randomInt(6, 12);
  const shuffled = [...recurringDocs].sort(() => Math.random() - 0.5).slice(0, selectedCount);
  return shuffled.map((rec) => ({
    id: crypto.randomUUID(),
    status: rec.data.isAutomatic ? 'automatic' : Math.random() > 0.6 ? 'complete' : 'incomplete',
    name: rec.data.name,
    amount: Number((rec.data.amount * randomFloat(0.85, 1.15)).toFixed(2)),
    link: rec.data.link,
    note: rec.data.note,
    isRecurring: true,
    isMarked: Math.random() > 0.88,
  }));
};

const buildBudgets = (recurringDocs) => {
  const now = new Date();
  const budgetWindowStart = new Date(now.getTime() - 95 * 24 * 60 * 60 * 1000);

  return Array.from({ length: BUDGET_COUNT }, (_, i) => {
    const createdAt = randomRecentDate(budgetWindowStart, now);

    const lineItems = buildBudgetLineItems(recurringDocs);
    const lineTotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const startingAmount = Number((lineTotal * randomFloat(1.1, 1.45)).toFixed(2));

    return {
      id: crypto.randomUUID(),
      data: {
        name: formatBudgetDateName(createdAt),
        dateCreated: isoDate(createdAt),
        startingAmount,
        lineItems,
      },
    };
  });
};

const buildClients = () => {
  const nowIso = new Date().toISOString();
  return clientTemplates.slice(0, CLIENT_COUNT).map((client) => ({
    id: crypto.randomUUID(),
    data: {
      name: client.name,
      email: client.email,
      invoiceCcEmails: client.cc,
      company: client.company,
      hourlyRate: client.hourlyRate,
      phone: client.phone,
      address: client.address,
      dateCreated: nowIso,
    },
  }));
};

const buildInvoiceLineItems = (hourlyRate) => {
  const itemCount = randomInt(2, 5);
  const chosen = [...invoiceTaskPool].sort(() => Math.random() - 0.5).slice(0, itemCount);
  return chosen.map(([description, [minHours, maxHours]]) => {
    const hours = Number(randomFloat(minHours, maxHours).toFixed(1));
    const rateVariance = randomFloat(-10, 15);
    const rate = Number((hourlyRate + rateVariance).toFixed(2));
    const amount = Number((hours * rate).toFixed(2));
    return {
      id: crypto.randomUUID(),
      description,
      hours,
      rate,
      amount,
    };
  });
};

const buildInvoices = (clients, currentYear) => {
  const statuses = ['paid', 'sent', 'draft', 'archived'];
  const now = new Date();
  const invoiceWindowStart = toStartOfDay(new Date(currentYear, 0, 1));

  return Array.from({ length: INVOICE_COUNT }, (_, idx) => {
    const client = clients[idx % clients.length];
    const createdAt = randomRecentDate(invoiceWindowStart, now);
    const dueAt = new Date(createdAt);
    dueAt.setDate(dueAt.getDate() + 30);

    const lineItems = buildInvoiceLineItems(client.data.hourlyRate);
    const total = Number(lineItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2));

    const status =
      idx < 11
        ? 'paid'
        : idx < 18
          ? 'sent'
          : idx < 23
            ? 'draft'
            : pick(statuses);

    const invoice = {
      id: crypto.randomUUID(),
      data: {
        invoiceNumber: toInvoiceNumber(currentYear, idx + 1),
        clientId: client.id,
        clientName: client.data.name,
        clientEmail: client.data.email,
        dateCreated: isoDate(createdAt),
        dateDue: isoDate(dueAt),
        status,
        lineItems,
        total,
        notes:
          'Thank you for the opportunity to support your engineering roadmap. Please remit payment via ACH within Net 30.',
        terms: 'Net 30',
      },
    };

    if (status === 'paid') {
      const paidAt = new Date(createdAt);
      paidAt.setDate(paidAt.getDate() + randomInt(7, 26));
      invoice.data.datePaid = isoDate(clampDateToNow(paidAt, now));
      invoice.data.dateSent = isoDate(
        clampDateToNow(new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000), now),
      );
    } else if (status === 'sent') {
      invoice.data.dateSent = isoDate(
        clampDateToNow(new Date(createdAt.getTime() + 24 * 60 * 60 * 1000), now),
      );
    }

    return invoice;
  });
};

const buildCompanySettings = () => ({
  id: 'default',
  companyName: 'Skyline Software Consulting LLC',
  email: 'billing@skylinesoftware.dev',
  phone: '+1 (415) 555-0192',
  address: '548 Market St PMB 71234\nSan Francisco, CA 94104',
  website: 'https://skylinesoftware.dev',
  defaultInvoiceNotes:
    'Thanks for your business. Please include the invoice number in payment details. ACH preferred. Late fees may apply after 30 days.',
  taxSetAsidePercentage: 30,
});

const deleteCollection = async (collectionRef) => {
  const snap = await collectionRef.get();
  if (snap.empty) return 0;
  const batch = admin.firestore().batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snap.size;
};

async function run() {
  admin.initializeApp({ projectId: PROJECT_ID });
  const db = admin.firestore();
  const auth = admin.auth();

  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Target user email: ${userEmail}`);
  console.log('Mode: clear-and-reseed');

  const user = await auth.getUserByEmail(userEmail);
  const uid = user.uid;
  const userDoc = db.collection('users').doc(uid);

  const recurring = buildRecurringDocs();
  const budgets = buildBudgets(recurring);
  const clients = buildClients();
  const currentYear = new Date().getFullYear();
  const invoices = buildInvoices(clients, currentYear);
  const settings = buildCompanySettings();

  const deleted = await Promise.all([
    deleteCollection(userDoc.collection('budgets')),
    deleteCollection(userDoc.collection('recurringExpenses')),
    deleteCollection(userDoc.collection('clients')),
    deleteCollection(userDoc.collection('invoices')),
  ]);
  console.log(
    `Deleted existing docs (budgets/recurring/clients/invoices): ${deleted.join('/')}`,
  );

  let batch = db.batch();
  let opCount = 0;
  let committed = 0;
  const commitBatchIfNeeded = async (force = false) => {
    if (opCount >= 450 || (force && opCount > 0)) {
      await batch.commit();
      committed += opCount;
      batch = db.batch();
      opCount = 0;
    }
  };
  const setDoc = async (docRef, data) => {
    batch.set(docRef, data);
    opCount += 1;
    await commitBatchIfNeeded();
  };

  for (const item of recurring) {
    await setDoc(userDoc.collection('recurringExpenses').doc(item.id), item.data);
  }
  for (const item of budgets) {
    await setDoc(userDoc.collection('budgets').doc(item.id), item.data);
  }
  for (const item of clients) {
    await setDoc(userDoc.collection('clients').doc(item.id), item.data);
  }
  for (const item of invoices) {
    await setDoc(userDoc.collection('invoices').doc(item.id), item.data);
  }

  await setDoc(userDoc.collection('settings').doc('companySettings'), settings);
  await setDoc(userDoc.collection('counters').doc('invoiceCounter'), {
    year: currentYear,
    count: INVOICE_COUNT,
  });
  await commitBatchIfNeeded(true);

  console.log('Seed complete.');
  console.log(
    JSON.stringify(
      {
        uid,
        budgetsCreated: budgets.length,
        recurringTemplatesCreated: recurring.length,
        clientsCreated: clients.length,
        invoicesCreated: invoices.length,
        invoiceCounter: { year: currentYear, count: INVOICE_COUNT },
        writesCommitted: committed,
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error('Seed failed:', error.message || error);
  process.exit(1);
});
