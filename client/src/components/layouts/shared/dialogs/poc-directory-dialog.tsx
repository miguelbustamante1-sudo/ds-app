'use client';

import { useState, useMemo } from 'react';
import { BookUser, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface PocLink {
  label: string;
  url: string;
}

interface PocEntry {
  task: string;
  sv: string;
  gt: string;
  mx: string;
  category: string;
  description?: string;
  links?: PocLink[];
  dashboard?: PocLink[];
  relatedForms?: PocLink[];
}

const POC_DATA: PocEntry[] = [
  { task: '90 days timeoff reminder', sv: 'Milton', gt: 'Milton', mx: 'Milton', category: 'Communication' },
  { task: 'Birthday/Anniversary Emails/Chat', sv: 'Milton', gt: 'Milton', mx: 'Milton', category: 'Communication', description: 'Information regarding the communications sent on each team member event' },
  { task: 'Certinia Errors & FAQs', sv: 'Gaby', gt: 'Gaby', mx: 'Gaby', category: 'Compliance', description: 'Information regarding certinia management, errors and others.', links: [{ label: 'TD DS - Certinia FAQ', url: 'https://docs.google.com/document/d/1rb8RKD36DQtiJ8cC4nV94FrwXTAZu9Gic9YBrR3lWkI/edit?usp=sharing' }] },
  { task: 'Client Time versus Compliance', sv: 'Gaby', gt: 'Gaby', mx: 'Gaby', category: 'Compliance', description: 'Information regarding flags generated in the comparison between client time and compliance' },
  { task: 'Compensatory Hours', sv: 'Jorge', gt: 'Jorge', mx: 'Jorge', category: 'Compensatory Hours', description: 'Any questions regarding the usage or the spendature of compensatory hours.', dashboard: [{ label: 'TM Dashboard', url: 'https://datastudio.google.com/reporting/924ad5ec-3aad-4afe-a1ab-d020b198d6d4/page/p_ysix92letd' }] },
  { task: 'Communication à la carte', sv: 'Milton', gt: 'Milton', mx: 'Milton', category: 'Communication', description: 'When you need to send a message in a preferred channel' },
  { task: 'Corporative Lines', sv: 'N/A', gt: 'Nova', mx: 'N/A', category: 'Corporate Lines' },
  { task: 'CSAT Analysis', sv: 'Gaby', gt: 'Gaby', mx: 'Gaby', category: 'CSAT', dashboard: [{ label: 'TM Scorecard', url: 'https://datastudio.google.com/u/0/reporting/924ad5ec-3aad-4afe-a1ab-d020b198d6d4/page/dJyvB/edit' }] },
  { task: 'CSR Activities', sv: 'Milton', gt: 'Milton', mx: 'Milton', category: 'CSR', description: 'Corporate Social Responsibility' },
  { task: 'CSR Payroll Donations TICA', sv: 'Jorge', gt: 'Jorge', mx: 'Jorge', category: 'CSR', description: 'Information regarding all donors information' },
  { task: 'DATO Attendance', sv: 'Gaby', gt: 'Gaby', mx: 'Gaby', category: 'People', description: 'Information regarding the team members attendance to the DATO events' },
  { task: 'FG Clearance', sv: 'Milton', gt: 'Milton', mx: 'Milton', category: 'People' },
  { task: 'FG Manager and Cost Center Change', sv: 'Milton', gt: 'Milton', mx: 'Milton', category: 'People' },
  { task: 'Headsets and Assets', sv: 'Milton', gt: 'Gaby', mx: 'N/A', category: 'Assets', relatedForms: [{ label: 'Request Form', url: 'https://docs.google.com/forms/d/e/1FAIpQLScpNoRQZUehgwEehE9gbwL4xOETFziXUJ4_Fybu46uIclqa0A/viewform' }] },
  { task: 'Incentives/GiftCards', sv: 'Nova', gt: 'Nova', mx: 'Nova', category: 'Giftcards' },
  { task: 'Invoice Compilation File', sv: 'Jorge', gt: 'Jorge', mx: 'Jorge', category: 'Invoices', description: 'Centralize the data of the generated invoices in a single file' },
  { task: 'Invoices', sv: 'Milton', gt: 'Milton', mx: 'Milton', category: 'Invoices', description: 'Creation of the invoices to be approved by the AGMs' },
  { task: 'Laptop Refresher', sv: 'Milton', gt: 'Milton', mx: 'N/A', category: 'Assets' },
  { task: 'Laptops Audits', sv: 'Jorge', gt: 'Nova', mx: 'N/A', category: 'Assets', description: 'Inventory review' },
  { task: 'Login Compliance', sv: 'Gaby', gt: 'Gaby', mx: 'Gaby', category: 'Compliance' },
  { task: 'Manual Flags', sv: 'Milton', gt: 'Milton', mx: 'Milton', category: 'Compliance' },
  { task: 'Onboardings', sv: 'Jorge', gt: 'Nova, Gaby', mx: 'Nova', category: 'People', description: 'Any questions regarding onboarding at any step, including Fieldglass approvals and creation' },
  { task: 'Parking Management', sv: 'N/A', gt: 'Nova', mx: 'N/A', category: 'Parking', description: 'Information regarding event parking requests', relatedForms: [{ label: 'GT Parking', url: 'https://docs.google.com/forms/d/e/1FAIpQLSd8aGs8cboAWECtotJTWptbcLIf91-HE0CgXuhX7P9jCgf0uw/viewform' }, { label: 'SV Parking', url: 'https://docs.google.com/forms/d/e/1FAIpQLScy_eKberJGZq0wDg3qSOoTUk0zq5JKli_zO0Y8RvRAGWCnRg/viewform' }] },
  { task: 'Payroll', sv: 'Jorge', gt: 'Gaby', mx: 'Nova', category: 'Payroll', description: 'Document that is shared to register the payments (Bonos, Reimbursements, On Call, English Bonus) that must be processed in each payroll event' },
  { task: 'Post Hiring Feedback', sv: 'Gaby', gt: 'Gaby', mx: 'Gaby', category: 'People', description: 'Information regarding surveys of recently onboarded members' },
  { task: 'ROL Report TICA', sv: 'Milton', gt: 'Milton', mx: 'Milton', category: 'Compliance', description: 'Information regarding the ROL report' },
  { task: 'SAP Hours Download', sv: 'Gaby', gt: 'Gaby', mx: 'Gaby', category: 'SAP', description: 'Information regarding client time' },
  { task: 'TDS Central America | IT & DS Liaison', sv: 'Milton', gt: 'Milton', mx: 'Milton', category: 'Assets' },
  { task: 'TDS Distros Check Report', sv: 'Jorge', gt: 'Jorge', mx: 'Jorge', category: 'Communication', description: 'Information regarding distros and communication channels' },
  { task: 'Tenure Flags Report (Timeoff Errors, WD/SFR, Teamcards/SFR)', sv: 'Nova', gt: 'Nova', mx: 'Nova', category: 'Compliance', description: 'Information regarding flags', dashboard: [{ label: 'Weekly Flags Dashboard', url: 'https://datastudio.google.com/reporting/eec92908-d79f-4b4f-8e65-0c24cf277445/page/shVvD' }] },
  { task: 'TM Information', sv: 'Milton', gt: 'Milton', mx: 'Milton', category: 'People', description: 'General information of a team member with known dimension' },
  { task: 'Training and Certifications File', sv: 'Jorge', gt: 'Nova', mx: 'Nova', category: 'L&D', description: 'Information regarding the process of certifications validation', relatedForms: [{ label: 'Inform Form', url: 'https://docs.google.com/forms/d/e/1FAIpQLSdFBgotS3ZZcxt47E25KJJBN-ZJKtQKgOx4kWjMco-UdVl5Mg/viewform' }] },
  { task: 'Training Purchase & Budget Admin', sv: 'Jorge', gt: 'Nova', mx: 'N/A', category: 'L&D', description: 'Promissory Notes, Training Approvals, Budget Q&A' },
  { task: 'Udemy', sv: 'Jorge', gt: 'Jorge', mx: 'Jorge', category: 'L&D', description: 'Any information related to your Udemy hours and how they are being counted towards tech hours' },
  { task: 'Waivers Approval for Weekly Flags', sv: 'Milton', gt: 'Milton', mx: 'Milton', category: 'Compliance' },
  { task: 'Willowtree Laptop Support', sv: 'Milton', gt: 'Milton', mx: 'Milton', category: 'Assets' },
  { task: 'DS App', sv: 'Milton', gt: 'Milton', mx: 'Milton', category: 'DS App', relatedForms: [{ label: 'Bugs Report', url: 'https://forms.monday.com/forms/5bf6f981f7dd8356c9ef24b4be40b97f?r=use1' }] },
];

const CATEGORY_COLORS: Record<string, string> = {
  Communication: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Compliance: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Compensatory Hours': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Corporate Lines': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  CSAT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  CSR: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  People: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  Assets: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Giftcards: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Invoices: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  Parking: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  Payroll: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  SAP: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  'L&D': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  'DS App': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
};

function pocBadgeClass(category: string) {
  return CATEGORY_COLORS[category] ?? 'bg-muted text-muted-foreground';
}

function ContactCell({ name }: { name: string }) {
  if (!name || name === 'N/A') {
    return <span className="text-muted-foreground text-xs">N/A</span>;
  }
  return <span className="font-medium text-sm">{name}</span>;
}

export function PocDirectoryDialog({ trigger }: { trigger: React.ReactNode }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return POC_DATA;
    return POC_DATA.filter(
      (entry) =>
        entry.task.toLowerCase().includes(q) ||
        entry.category.toLowerCase().includes(q) ||
        entry.sv.toLowerCase().includes(q) ||
        entry.gt.toLowerCase().includes(q) ||
        entry.mx.toLowerCase().includes(q) ||
        (entry.description ?? '').toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent variant="fullscreen" className="flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border mb-0">
          <div className="flex items-center gap-3">
            <BookUser className="size-5 text-primary" />
            <DialogTitle className="text-xl">POC Directory</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Points of contact for each task and information area by site.
          </p>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by task, category, or contact name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6 py-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="sticky top-0 bg-background z-10">
                <th className="text-start font-semibold text-muted-foreground py-2 pr-4 border-b border-border whitespace-nowrap w-[30%]">
                  Task / Information Area
                </th>
                <th className="text-center font-semibold text-muted-foreground py-2 px-3 border-b border-border whitespace-nowrap">
                  SV
                </th>
                <th className="text-center font-semibold text-muted-foreground py-2 px-3 border-b border-border whitespace-nowrap">
                  GT
                </th>
                <th className="text-center font-semibold text-muted-foreground py-2 px-3 border-b border-border whitespace-nowrap">
                  MX
                </th>
                <th className="text-start font-semibold text-muted-foreground py-2 px-3 border-b border-border whitespace-nowrap">
                  Category
                </th>
                <th className="text-start font-semibold text-muted-foreground py-2 px-3 border-b border-border">
                  Description
                </th>
                <th className="text-start font-semibold text-muted-foreground py-2 px-3 border-b border-border whitespace-nowrap">
                  Dashboard
                </th>
                <th className="text-start font-semibold text-muted-foreground py-2 px-3 border-b border-border whitespace-nowrap">
                  Related Forms
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-muted-foreground">
                    No results found.
                  </td>
                </tr>
              )}
              {filtered.map((entry, i) => (
                <tr
                  key={entry.task}
                  className={i % 2 === 0 ? 'bg-transparent' : 'bg-muted/30'}
                >
                  <td className="py-2.5 pr-4 font-medium align-top">{entry.task}</td>
                  <td className="py-2.5 px-3 text-center align-top">
                    <ContactCell name={entry.sv} />
                  </td>
                  <td className="py-2.5 px-3 text-center align-top">
                    <ContactCell name={entry.gt} />
                  </td>
                  <td className="py-2.5 px-3 text-center align-top">
                    <ContactCell name={entry.mx} />
                  </td>
                  <td className="py-2.5 px-3 align-top">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ${pocBadgeClass(entry.category)}`}
                    >
                      {entry.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground align-top text-xs leading-relaxed">
                    {entry.description ?? ''}
                    {entry.links?.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-1 text-primary underline underline-offset-2 hover:opacity-80"
                      >
                        {link.label}
                      </a>
                    ))}
                  </td>
                  <td className="py-2.5 px-3 align-top">
                    {entry.dashboard?.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-primary underline underline-offset-2 hover:opacity-80"
                      >
                        {link.label}
                      </a>
                    ))}
                  </td>
                  <td className="py-2.5 px-3 align-top">
                    {entry.relatedForms?.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-primary underline underline-offset-2 hover:opacity-80"
                      >
                        {link.label}
                      </a>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-border text-xs text-muted-foreground">
          {filtered.length} of {POC_DATA.length} entries
        </div>
      </DialogContent>
    </Dialog>
  );
}
