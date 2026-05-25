import {
  AlarmClock,
  AlertCircle,
  ArrowLeftRight,
  Award,
  Badge,
  BarChart2,
  Bell,
  Bitcoin,
  Book,
  Briefcase,
  Building,
  CalendarArrowDown,
  CalendarCheck,
  Captions,
  CheckCircle,
  Clock,
  Code,
  Coffee,
  Database,
  File as DocumentIcon,
  Euro,
  Eye,
  FileQuestion,
  FileText,
  Flag,
  Globe,
  Ghost,
  Gift,
  Grid,
  Heart,
  HelpCircle,
  Inbox,
  Kanban,
  Key,
  Layout,
  LayoutGrid,
  LifeBuoy,
  MessageSquare,
  Monitor,
  MonitorUp,
  ClipboardClock,
  Network,
  Users as PeopleIcon,
  Plug,
  Share2,
  SquareMousePointer,
  Star,
  TrendingUp,
  UserCheck,
  UserCircle,
  Users,
  Briefcase as WorkIcon,
  FolderKanban,
  ShieldCheck,
  Umbrella,
  Zap,
  Hammer,
} from 'lucide-react';
import { MenuConfig } from '@/config/types';

export const MENU_SIDEBAR: MenuConfig = [
  {
    title: 'Dashboard',
    icon: LayoutGrid,
    children: [
      { title: 'Time Off', path: '/' },
    ],
  },
  { heading: 'User' },
  {
    title: 'My Team',
    icon: Users,
    path: '/my-team',
    permission: 'MyTeam',
  },
  {
    title: 'Profile',
    icon: UserCircle,
    path: '/my-profile',
    permission: 'MyProfile',
  },
  { heading: 'Self Service' },
  {
    title: 'My Time Off',
    icon: CalendarCheck,
    path: '/my-time-off',
    permission: 'MyTimeOff',
  },
  {
    title: 'Holiday Swaps',
    icon: CalendarCheck,
    path: '/holiday-swaps',
    permission: 'HolidaySwaps',
  },
  {
    title: 'Time Off Activity',
    icon: Clock,
    path: '/timeoff-activity',
    permission: 'TimeOffActivity',
  },
  {
    title: 'Comp Time Approval Mgmt',
    icon: ClipboardClock,
    path: '/approval-management',
    permission: 'CompensatoryTime',
    subPermission: ['supervisor', 'admin'],
  },
  {
    title: 'My Comp Time Intake',
    icon: ClipboardClock,
    path: '/compensatory-time/intake',
    permission: 'CompensatoryTime',
  },
  {
    title: 'My Comp Time Usage',
    icon: ClipboardClock,
    path: '/compensatory-time/usage',
    permission: 'CompensatoryTime',
  },
  { heading: 'Actions' },
  {
    title: 'My Tasks',
    icon: Inbox,
    path: '/my-tasks',
    permission: 'Workflow',
  },
  {
    title: 'Supervisor Time Off',
    icon: Users,
    path: '/supervisor-time-off',
    permission: 'SupervisorTimeOff',
  },
  {
    title: 'Team Holiday Swaps',
    icon: CalendarCheck,
    path: '/supervisor-holiday-swaps',
    permission: 'SupervisorHolidaySwaps',
  },
  {
    title: 'Time Off Review',
    icon: CalendarCheck,
    path: '/time-off-management',
    permission: 'TimeOffReview',
  },
  {
    title: 'Project Assignments',
    icon: FolderKanban,
    path: '/project-assignments',
    permission: 'ProjectAssignments',
  },
  {
    title: 'Pending Requests',
    icon: Inbox,
    path: '/my-team/pending',
    permission: 'PendingRequests',
  },
  {
    title: 'Bench Move',
    icon: ArrowLeftRight,
    path: '/bench-move',
    permission: 'BenchMove',
  },
  {
    title: 'End Bench',
    icon: UserCheck,
    path: '/end-bench',
    permission: 'BenchRemove',
  },
  {
    title: 'Template Builder',
    icon: Hammer,
    path: '/template-builder',
    permission: 'PersistenceTables',
  },
  {
    title: 'Data Import',
    icon: MonitorUp,
    path: '/data-import',
    permission: 'PersistenceTables',
  },
  { heading: 'Reports' },
  {
    title: 'Reports',
    icon: BarChart2,
    path: '/reports',
    permission: 'Reports',
  },
  {
    title: 'Manage Dynamic Reports',
    icon: Database,
    path: '/reports/dynamic',
    permission: 'Reports',
  },
  { heading: 'Communications' },
  {
    title: 'Announcements',
    icon: Bell,
    path: '/announcements',
    permission: 'Notifications',
  },
  {
    title: 'Notification Center',
    icon: Inbox,
    path: '/notification-center',
    permission: 'NotificationCenter',
  },
  { heading: 'BSA', role: 'bsa' },
  {
    title: 'Endorsements',
    icon: Award,
    path: '/endorsements',
    role: 'bsa',
    permission: 'Endorsements',
  },
  {
    title: 'Hiring',
    icon: UserCheck,
    path: '/hiring',
    role: 'bsa',
    permission: 'Hiring',
  },
  {
    title: 'Time Off Exception',
    icon: Zap,
    path: '/timeoff-exception',
    role: 'bsa',
    permission: 'TimeOffException',
  },
  {
    title: 'Holiday Swap Exception',
    icon: CalendarArrowDown,
    path: '/holiday-swap-exception',
    role: 'bsa',
    permission: 'HolidaySwapException',
  },
  { heading: 'Workflow', permission: 'WorkflowAdmin' },
  {
    title: 'Workflow',
    icon: Kanban,
    permission: 'WorkflowAdmin',
    children: [
      { title: 'Templates', path: '/admin/workflow/templates', icon: FileText },
      { title: 'Instances', path: '/admin/workflow/instances', icon: Monitor },
    ],
  },
  { heading: 'Security', role: 'admin' },
  {
    title: 'Access Control',
    icon: ShieldCheck,
    role: 'admin',
    children: [
      {
        title: 'Roles',
        path: '/security/roles',
        icon: Key,
        permission: 'RBACRoles',
      },
      {
        title: 'Resources',
        path: '/security/options',
        icon: Database,
        permission: 'RBACOptions',
      },
      {
        title: 'Permissions Matrix',
        path: '/security/permissions',
        icon: ShieldCheck,
        permission: 'RBACPermissions',
      },
    ],
  },
  { heading: 'Maintenance', role: 'bsa' },
  {
    title: 'Master Data',
    icon: Database,
    role: 'bsa',
    children: [
      { title: 'Bonus Categories', path: '/maintenance/bonus-categories', icon: Star, permission: 'Endorsements' },
      { title: 'Bonus Subcategories', path: '/maintenance/bonus-subcategories', icon: Star, permission: 'Endorsements' },
      { title: 'Clients', path: '/maintenance/clients', icon: Building, permission: 'Clients' },
      { title: 'Client Contacts', path: '/maintenance/client-contacts', icon: Building, permission: 'Clients' },
      { title: 'Countries', path: '/maintenance/countries', icon: Globe, permission: 'Countries' },
      { title: 'Functional Areas', path: '/maintenance/functional-areas', icon: Network, permission: 'FunctionalAreas' },
      { title: 'Holidays', path: '/maintenance/holidays', icon: Gift, permission: 'Holidays' },
      { title: 'Projects', path: '/maintenance/projects', icon: FolderKanban, permission: 'Projects' },
      { title: 'Shifts', path: '/maintenance/shifts', icon: AlarmClock, permission: 'Shift' },
      { title: 'Supervisor Assignments', path: '/maintenance/supervisor-assignments', icon: UserCheck, permission: 'SupervisorAssignments' },
      { title: 'Team Members', path: '/maintenance/team-members', icon: Users, permission: 'TeamMembers' },
      { title: 'Tier Bands', path: '/maintenance/tier-bands', icon: TrendingUp, permission: 'TierBands' },
      { title: 'Time Off Statuses', path: '/maintenance/time-off-statuses', icon: CheckCircle, permission: 'TimeOffStatuses' },
      { title: 'Vacation Period Maintenance', path: '/maintenance/timeoff-period-backfill', icon: CalendarCheck, permission: 'TimeOffPeriodMaintenance' },
      { title: 'Type of TimeOff', path: '/maintenance/time-off-types', icon: Umbrella, permission: 'TimeOffCategories' },
      { title: 'Type of TimeOff by Country', path: '/maintenance/category-country', icon: Flag, permission: 'TimeOffCategoriesByCountry' },
      { title: 'Users', path: '/maintenance/users', icon: UserCircle, permission: 'Users' },
      { title: 'Workday Info', path: '/maintenance/workday-info', icon: WorkIcon, permission: 'WorkdayInfo' },
    ],
  },
];

export const MENU_MEGA: MenuConfig = [
  { title: 'Home', path: '/' },
  {
    title: 'Profiles',
    children: [
      {
        title: 'Profiles',
        children: [
          {
            children: [
              {
                title: 'Default',
                icon: Badge,
                path: '#',
              },
              {
                title: 'Creator',
                icon: Coffee,
                path: '#',
              },
              {
                title: 'Company',
                icon: Building,
                path: '#',
              },
              {
                title: 'NFT',
                icon: Bitcoin,
                path: '#',
              },
              {
                title: 'Blogger',
                icon: MessageSquare,
                path: '#',
              },
              {
                title: 'CRM',
                icon: Monitor,
                path: '#',
              },
              {
                title: 'Gamer',
                icon: Ghost,
                path: '#',
              },
            ],
          },
          {
            children: [
              {
                title: 'Feeds',
                icon: Book,
                path: '#',
              },
              {
                title: 'Plain',
                icon: FileText,
                path: '#',
              },
              {
                title: 'Modal',
                icon: SquareMousePointer,
                path: '#',
              },
              {
                title: 'Freelancer',
                icon: Briefcase,
                path: '#',
                disabled: true,
              },
              { title: 'Developer', icon: Code, path: '#', disabled: true },
              { title: 'Team', icon: Users, path: '#', disabled: true },
              {
                title: 'Events',
                icon: CalendarCheck,
                path: '#',
                disabled: true,
              },
            ],
          },
        ],
      },
      {
        title: 'Other Pages',
        children: [
          {
            children: [
              {
                title: 'Projects - 3 Cols',
                icon: Layout,
                path: '#',
              },
              {
                title: 'Projects - 2 Cols',
                icon: Grid,
                path: '#',
              },
              { title: 'Works', icon: WorkIcon, path: '#' },
              {
                title: 'Teams',
                icon: PeopleIcon,
                path: '#',
              },
              {
                title: 'Network',
                icon: Network,
                path: '#',
              },
              {
                title: 'Activity',
                icon: TrendingUp,
                path: '#',
              },
              {
                title: 'Campaigns - Card',
                icon: LayoutGrid,
                path: '#',
              },
            ],
          },
          {
            children: [
              {
                title: 'Campaigns - List',
                icon: Kanban,
                path: '#',
              },
              { title: 'Empty', icon: FileText, path: '#' },
              {
                title: 'Documents',
                icon: DocumentIcon,
                path: '#',
                disabled: true,
              },
              { title: 'Badges', icon: Award, path: '#', disabled: true },
              { title: 'Awards', icon: Gift, path: '#', disabled: true },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'My Account',
    children: [
      {
        title: 'General Pages',
        children: [
          { title: 'Integrations', icon: Plug, path: '#' },
          {
            title: 'Notifications',
            icon: Bell,
            path: '#',
          },
          { title: 'API Keys', icon: Key, path: '#' },
          { title: 'Appearance', icon: Eye, path: '#' },
          {
            title: 'Invite a Friend',
            icon: UserCheck,
            path: '#',
          },
          { title: 'Activity', icon: LifeBuoy, path: '#' },
          { title: 'Brand', icon: CheckCircle, disabled: true },
          { title: 'Get Paid', icon: Euro, disabled: true },
        ],
      },
      {
        title: 'Other pages',
        children: [
          {
            title: 'Account Home',
            children: [
              { title: 'Get Started', path: '#' },
              { title: 'User Profile', path: '#' },
              {
                title: 'Company Profile',
                path: '#',
              },
              { title: 'With Sidebar', path: '#' },
              {
                title: 'Enterprise',
                path: '#',
              },
              { title: 'Plain', path: '#' },
              { title: 'Modal', path: '#' },
            ],
          },
          {
            title: 'Billing',
            children: [
              { title: 'Basic Billing', path: '#' },
              { title: 'Enterprise', path: '#' },
              { title: 'Plans', path: '#' },
              { title: 'Billing History', path: '#' },
              { title: 'Tax Info', disabled: true },
              { title: 'Invoices', disabled: true },
              { title: 'Gateaways', disabled: true },
            ],
          },
          {
            title: 'Security',
            children: [
              { title: 'Get Started', path: '#' },
              {
                title: 'Security Overview',
                path: '#',
              },
              {
                title: 'IP Addresses',
                path: '#',
              },
              {
                title: 'Privacy Settings',
                path: '#',
              },
              {
                title: 'Device Management',
                path: '#',
              },
              {
                title: 'Backup & Recovery',
                path: '#',
              },
              {
                title: 'Current Sessions',
                path: '#',
              },
              { title: 'Security Log', path: '#' },
            ],
          },
          {
            title: 'Members & Roles',
            children: [
              { title: 'Teams Starter', path: '#' },
              { title: 'Teams', path: '#' },
              { title: 'Team Info', path: '#' },
              {
                title: 'Members Starter',
                path: '#',
              },
              { title: 'Team Members', path: '#' },
              {
                title: 'Import Members',
                path: '#',
              },
              { title: 'Roles', path: '#' },
              {
                title: 'Permissions - Toggler',
                path: '#',
              },
              {
                title: 'Permissions - Check',
                path: '#',
              },
            ],
          },
          {
            title: 'Other Pages',
            children: [
              { title: 'Integrations', path: '#' },
              { title: 'Notifications', path: '#' },
              { title: 'API Keys', path: '#' },
              { title: 'Appearance', path: '#' },
              { title: 'Invite a Friend', path: '#' },
              { title: 'Activity', path: '#' },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Network',
    children: [
      {
        title: 'General Pages',
        children: [
          { title: 'Get Started', icon: Flag, path: '#' },
          { title: 'Colleagues', icon: Users, path: '#', disabled: true },
          { title: 'Donators', icon: Heart, path: '#', disabled: true },
          { title: 'Leads', icon: Zap, path: '#', disabled: true },
        ],
      },
      {
        title: 'Other pages',
        children: [
          {
            title: 'User Cards',
            children: [
              { title: 'Mini Cards', path: '#' },
              { title: 'Team Members', path: '#' },
              { title: 'Authors', path: '#' },
              { title: 'NFT Users', path: '#' },
              { title: 'Social Users', path: '#' },
              { title: 'Gamers', path: '#', disabled: true },
            ],
          },
          {
            title: 'User Base',
            badge: 'Datatables',
            children: [
              { title: 'Team Crew', path: '#' },
              { title: 'App Roster', path: '#' },
              {
                title: 'Market Authors',
                path: '#',
              },
              { title: 'SaaS Users', path: '#' },
              {
                title: 'Store Clients',
                path: '#',
              },
              { title: 'Visitors', path: '#' },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Authentication',
    children: [
      {
        title: 'General pages',
        children: [
          {
            title: 'Access',
            children: [
              {
                title: 'Sign In',
                icon: UserCircle,
                path: '/auth/signin',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Store ',
    children: [
      {
        title: 'Store - Client',
        children: [
          {
            children: [
              { title: 'Home', path: '/' },
              {
                title: 'Search Results - Grid',
                path: '#',
              },
              {
                title: 'Search Results - List',
                path: '#',
              },
              {
                title: 'Product Details',
                path: '#',
              },
              { title: 'Wishlist', path: '#' },
              { title: 'My Orders', path: '#' },
            ],
          },
          {
            children: [
              {
                title: 'Checkout - Order Summary',
                path: '#',
              },
              {
                title: 'Checkout - Shipping Info',
                path: '#',
              },
              {
                title: 'Checkout - Payment Method',
                path: '#',
              },
              {
                title: 'Checkout - Order Placed',
                path: '#',
              },
              { title: 'Order Receipt', path: '#' },
            ],
          },
        ],
      },
    ],
  },
];

export const MENU_MEGA_MOBILE: MenuConfig = [
  { title: 'Home', path: '/' },
  {
    title: 'Profiles',
    children: [
      {
        title: 'Profiles',
        children: [
          {
            title: 'Default',
            icon: Badge,
            path: '#',
          },
          {
            title: 'Creator',
            icon: Coffee,
            path: '#',
          },
          {
            title: 'Company',
            icon: Building,
            path: '#',
          },
          { title: 'NFT', icon: Bitcoin, path: '#' },
          {
            title: 'Blogger',
            icon: MessageSquare,
            path: '#',
          },
          { title: 'CRM', icon: Monitor, path: '#' },
          {
            title: 'Gamer',
            icon: Ghost,
            path: '#',
          },
          {
            title: 'Feeds',
            icon: Book,
            path: '#',
          },
          {
            title: 'Plain',
            icon: DocumentIcon,
            path: '#',
          },
          {
            title: 'Modal',
            icon: SquareMousePointer,
            path: '#',
          },
          { title: 'Freelancer', icon: Briefcase, path: '#', disabled: true },
          { title: 'Developer', icon: Code, path: '#', disabled: true },
          { title: 'Team', icon: Users, path: '#', disabled: true },
          { title: 'Events', icon: CalendarCheck, path: '#', disabled: true },
        ],
      },
      {
        title: 'Other Pages',
        children: [
          {
            title: 'Projects - 3 Cols',
            icon: Layout,
            path: '#',
          },
          {
            title: 'Projects - 2 Cols',
            icon: Grid,
            path: '#',
          },
          { title: 'Works', path: '#' },
          { title: 'Teams', path: '#' },
          { title: 'Network', path: '#' },
          {
            title: 'Activity',
            icon: TrendingUp,
            path: '#',
          },
          {
            title: 'Campaigns - Card',
            icon: LayoutGrid,
            path: '#',
          },
          {
            title: 'Campaigns - List',
            icon: Kanban,
            path: '#',
          },
          { title: 'Empty', path: '#' },
          { title: 'Documents', path: '#', disabled: true },
          { title: 'Badges', path: '#', disabled: true },
          { title: 'Awards', path: '#', disabled: true },
        ],
      },
    ],
  },
  {
    title: 'My Account',
    children: [
      {
        title: 'General Pages',
        children: [
          { title: 'Integrations', icon: Plug, path: '#' },
          {
            title: 'Notifications',
            icon: Bell,
            path: '#',
          },
          { title: 'API Keys', icon: Key, path: '#' },
          { title: 'Appearance', icon: Eye, path: '#' },
          {
            title: 'Invite a Friend',
            icon: UserCheck,
            path: '#',
          },
          { title: 'Activity', icon: LifeBuoy, path: '#' },
          { title: 'Brand', icon: CheckCircle, disabled: true },
          { title: 'Get Paid', icon: Euro, disabled: true },
        ],
      },
      {
        title: 'Other pages',
        children: [
          {
            title: 'Account Home',
            children: [
              { title: 'Get Started', path: '#' },
              { title: 'User Profile', path: '#' },
              {
                title: 'Company Profile',
                path: '#',
              },
              { title: 'With Sidebar', path: '#' },
              {
                title: 'Enterprise',
                path: '#',
              },
              { title: 'Plain', path: '#' },
              { title: 'Modal', path: '#' },
            ],
          },
          {
            title: 'Billing',
            children: [
              { title: 'Basic Billing', path: '#' },
              { title: 'Enterprise', path: '#' },
              { title: 'Plans', path: '#' },
              { title: 'Billing History', path: '#' },
              { title: 'Tax Info', disabled: true },
              { title: 'Invoices', disabled: true },
              { title: 'Gateaways', disabled: true },
            ],
          },
          {
            title: 'Security',
            children: [
              { title: 'Get Started', path: '#' },
              {
                title: 'Security Overview',
                path: '#',
              },
              {
                title: 'IP Addresses',
                path: '#',
              },
              {
                title: 'Privacy Settings',
                path: '#',
              },
              {
                title: 'Device Management',
                path: '#',
              },
              {
                title: 'Backup & Recovery',
                path: '#',
              },
              {
                title: 'Current Sessions',
                path: '#',
              },
              { title: 'Security Log', path: '#' },
            ],
          },
          {
            title: 'Members & Roles',
            children: [
              { title: 'Teams Starter', path: '#' },
              { title: 'Teams', path: '#' },
              { title: 'Team Info', path: '#' },
              {
                title: 'Members Starter',
                path: '#',
              },
              { title: 'Team Members', path: '#' },
              {
                title: 'Import Members',
                path: '#',
              },
              { title: 'Roles', path: '#' },
              {
                title: 'Permissions - Toggler',
                path: '#',
              },
              {
                title: 'Permissions - Check',
                path: '#',
              },
            ],
          },
          {
            title: 'Other Pages',
            children: [
              { title: 'Integrations', path: '#' },
              { title: 'Notifications', path: '#' },
              { title: 'API Keys', path: '#' },
              { title: 'Appearance', path: '#' },
              { title: 'Invite a Friend', path: '#' },
              { title: 'Activity', path: '#' },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Network',
    children: [
      {
        title: 'General Pages',
        children: [
          { title: 'Get Started', icon: Flag, path: '#' },
          { title: 'Colleagues', icon: Users, path: '#', disabled: true },
          { title: 'Donators', icon: Heart, path: '#', disabled: true },
          { title: 'Leads', icon: Zap, path: '#', disabled: true },
        ],
      },
      {
        title: 'Other pages',
        children: [
          {
            title: 'User Cards',
            children: [
              { title: 'Mini Cards', path: '#' },
              { title: 'Team Members', path: '#' },
              { title: 'Authors', path: '#' },
              { title: 'NFT Users', path: '#' },
              { title: 'Social Users', path: '#' },
              { title: 'Gamers', path: '#', disabled: true },
            ],
          },
          {
            title: 'User Base',
            badge: 'Datatables',
            children: [
              { title: 'Team Crew', path: '#' },
              { title: 'App Roster', path: '#' },
              {
                title: 'Market Authors',
                path: '#',
              },
              { title: 'SaaS Users', path: '#' },
              {
                title: 'Store Clients',
                path: '#',
              },
              { title: 'Visitors', path: '#' },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Store - Client',
    children: [
      { title: 'Home', path: '/' },
      {
        title: 'Search Results - Grid',
        path: '#',
      },
      {
        title: 'Search Results - List',
        path: '#',
      },
      { title: 'Product Details', path: '#' },
      { title: 'Wishlist', path: '#' },
      {
        title: 'Checkout',
        children: [
          {
            title: 'Order Summary',
            path: '#',
          },
          {
            title: 'Shipping Info',
            path: '#',
          },
          {
            title: 'Payment Method',
            path: '#',
          },
          {
            title: 'Order Placed',
            path: '#',
          },
        ],
      },
      { title: 'My Orders', path: '#' },
      { title: 'Order Receipt', path: '#' },
    ],
  },
  {
    title: 'Authentication',
    children: [
      {
        title: 'General pages',
        children: [
          {
            title: 'Access',
            children: [
              {
                title: 'Sign In',
                icon: UserCircle,
                path: '/auth/signin',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Help',
    children: [
      {
        title: 'Getting Started',
        icon: Coffee,
        path: 'https://keenthemes.com/metronic/tailwind/docs/getting-started/installation',
      },
      {
        title: 'Support Forum',
        icon: AlertCircle,
        children: [
          {
            title: 'All Questions',
            icon: FileQuestion,
            path: 'https://devs.keenthemes.com',
          },
          {
            title: 'Popular Questions',
            icon: Star,
            path: 'https://devs.keenthemes.com/popular',
          },
          {
            title: 'Ask Question',
            icon: HelpCircle,
            path: 'https://devs.keenthemes.com/question/create',
          },
        ],
      },
      {
        title: 'Licenses & FAQ',
        icon: Captions,
        path: 'https://keenthemes.com/metronic/tailwind/docs/getting-started/license',
      },
      {
        title: 'Documentation',
        icon: FileQuestion,
        path: 'https://keenthemes.com/metronic/tailwind/docs',
      },
      { separator: true },
      {
        title: 'Contact Us',
        icon: Share2,
        path: 'https://keenthemes.com/contact',
      },
    ],
  },
];
