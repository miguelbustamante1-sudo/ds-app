export interface TabConfig {
  id: 'employee' | 'date-range' | 'category' | 'reviewer';
  label: string;
  defaultSort: { id: string; desc: boolean }[];
  pinnedLeft: string[];
}

export const TABS: TabConfig[] = [
  {
    id: 'employee',
    label: 'By Employee',
    defaultSort: [{ id: 'changeDate', desc: true }],
    pinnedLeft: ['employeeFullName'],
  },
  {
    id: 'date-range',
    label: 'By Date Range',
    defaultSort: [{ id: 'changeDate', desc: true }],
    pinnedLeft: ['changeDate'],
  },
  {
    id: 'category',
    label: 'By Category',
    defaultSort: [
      { id: 'origCategory', desc: false },
      { id: 'changeDate', desc: true },
    ],
    pinnedLeft: ['origCategory'],
  },
  {
    id: 'reviewer',
    label: 'By Reviewer',
    defaultSort: [{ id: 'changeDate', desc: true }],
    pinnedLeft: ['changedByName'],
  },
];

export type TabId = TabConfig['id'];
