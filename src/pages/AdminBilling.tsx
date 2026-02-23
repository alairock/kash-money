import { useState } from 'react';

type BillingMode = 'annual' | 'monthly';

interface Plan {
  name: string;
  annualPrice: string;
  monthlyPrice: string;
  features: string[];
  highlight?: boolean;
  current?: boolean;
}

interface PlanSection {
  title: string;
  subtitle: string;
  plans: Plan[];
}

const planSections: PlanSection[] = [
  {
    title: 'Invoicing',
    subtitle: 'For invoice, client, and invoicing settings workflows',
    plans: [
      {
        name: 'Free',
        annualPrice: 'Free',
        monthlyPrice: 'Free',
        current: true,
        features: ['1 client', '2 invoices monthly', 'Invoice PDF export'],
      },
      {
        name: 'Basic',
        annualPrice: '$5/month',
        monthlyPrice: '$6.99/month',
        highlight: true,
        features: ['5 clients', '10 invoices monthly', 'Email preview + send workflow'],
      },
      {
        name: 'Pro',
        annualPrice: '$10/month',
        monthlyPrice: '$12.99/month',
        features: ['50 clients', '100 invoices monthly', 'Invoice status tracking + tax set-aside'],
      },
      {
        name: 'Advanced',
        annualPrice: '$30/month',
        monthlyPrice: '$34.99/month',
        features: ['1000 Clients', '1000 Invoices Monthly', 'Priority invoicing support'],
      },
    ],
  },
  {
    title: 'Budgets',
    subtitle: 'For budgets, line items, and recurring expense planning',
    plans: [
      {
        name: 'Free',
        annualPrice: 'Free',
        monthlyPrice: 'Free',
        current: true,
        features: ['3 active budgets', '5 recurring expense templates', 'Manual line item tracking'],
      },
      {
        name: 'Basic',
        annualPrice: '$4/month',
        monthlyPrice: '$5.99/month',
        highlight: true,
        features: ['20 active budgets', '25 recurring templates', 'Link + notes on budget line items'],
      },
      {
        name: 'Pro',
        annualPrice: '$8/month',
        monthlyPrice: '$10.99/month',
        features: ['100 active budgets', '100 recurring templates', 'Automatic recurring item defaults in new budgets'],
      },
      {
        name: 'Advanced',
        annualPrice: '$20/month',
        monthlyPrice: '$24.99/month',
        features: ['Unlimited budgets*', 'Unlimited recurring templates*', 'Advanced budgeting analytics (coming soon)'],
      },
    ],
  },
  {
    title: 'All Products',
    subtitle: 'Bundled access to Budgets and Invoicing together',
    plans: [
      {
        name: 'Starter',
        annualPrice: '$12/month',
        monthlyPrice: '$14.99/month',
        highlight: true,
        features: ['Includes Basic Invoicing + Basic Budgets', '10 invoices monthly', '20 active budgets'],
      },
      {
        name: 'Business',
        annualPrice: '$22/month',
        monthlyPrice: '$27.99/month',
        features: ['Includes Pro Invoicing + Pro Budgets', '100 invoices monthly', '100 active budgets'],
      },
      {
        name: 'Scale',
        annualPrice: '$45/month',
        monthlyPrice: '$54.99/month',
        features: ['Includes Advanced Invoicing + Advanced Budgets', '1000 invoices monthly', 'Unlimited budgets*'],
      },
    ],
  },
];

export const AdminBilling = () => {
  const [billingMode, setBillingMode] = useState<BillingMode>('annual');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Plans</h2>
        <div className="glass-dark inline-flex rounded-lg p-1">
          <button
            type="button"
            onClick={() => setBillingMode('annual')}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-all ${
              billingMode === 'annual'
                ? 'glass-effect text-white shadow-lg'
                : 'text-white/75 hover:text-white'
            }`}
          >
            Annual
          </button>
          <button
            type="button"
            onClick={() => setBillingMode('monthly')}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-all ${
              billingMode === 'monthly'
                ? 'glass-effect text-white shadow-lg'
                : 'text-white/75 hover:text-white'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {planSections.map((section) => (
          <section key={section.title} className="space-y-3">
            <div>
              <h3 className="text-lg font-bold">{section.title}</h3>
              <p className="text-sm text-white/70">{section.subtitle}</p>
            </div>

            <div
              className={`grid gap-4 ${
                section.plans.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 xl:grid-cols-4'
              }`}
            >
              {section.plans.map((plan) => (
                <div
                  key={`${section.title}-${plan.name}`}
                  className={`rounded-2xl border p-6 shadow-xl ${
                    plan.highlight
                      ? 'glass-effect border-white/30'
                      : 'bg-white/5 border-white/15 backdrop-blur-sm'
                  }`}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <h4 className="text-2xl font-black">{plan.name}</h4>
                    <p className="rounded-md bg-white/10 px-2 py-1 text-sm font-bold text-white">
                      {billingMode === 'annual' ? plan.annualPrice : plan.monthlyPrice}
                    </p>
                  </div>
                  <ul className="space-y-2 text-sm text-white/85">
                    {plan.features.map((feature) => (
                      <li key={feature}>• {feature}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled
                    className="mt-6 w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold text-white/70"
                  >
                    {plan.current ? 'Curren Plan' : 'Coming soon'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="text-sm text-white/70">
        * Prices subject to change
      </p>
    </div>
  );
};
