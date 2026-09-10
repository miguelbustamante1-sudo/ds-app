import {
  AlertCircle,
  Award,
  Badge,
  BarChart2,
  Bell,
  Bitcoin,
  Book,
  Briefcase,
  Building,
  CalendarCheck,
  Captions,
  CheckCircle,
  Code,
  Coffee,
  File as DocumentIcon,
  Euro,
  Eye,
  FileQuestion,
  FileText,
  Flag,
  Ghost,
  Gift,
  Grid,
  Heart,
  HelpCircle,
  Kanban,
  ClipboardList,
  Key,
  Layout,
  LayoutGrid,
  LifeBuoy,
  MessageSquare,
  Monitor,
  Network,
  Users as PeopleIcon,
  Plug,
  Share2,
  ShieldCheck,
  SquareMousePointer,
  Star,
  TrendingUp,
  Umbrella,
  UserCheck,
  UserCircle,
  Users,
  Briefcase as WorkIcon,
  Database,
  FolderGit2,
  Zap,
  Smartphone,
  Wallet,
  Laptop,
  Target,
} from 'lucide-react';
import { MenuConfig } from '@/config/types';

export const MENU_SIDEBAR: MenuConfig = [
  {
    title: 'Dashboard',
    icon: LayoutGrid,
    path: '/',
  },
  {
    title: 'Communications & Awareness',
    icon: Bell,
    path: '/communications-hub',
    children: [
      { title: 'My Team', path: '/my-team', permission: 'MyTeam' },
      { title: 'Announcements', path: '/announcements', permission: 'Notifications' },
      { title: 'Notification Center', path: '/notification-center', permission: 'NotificationCenter' },
      { title: 'Action Items', path: '/my-team/pending', permission: 'PendingRequests' },
      { title: 'My Tasks', path: '/my-tasks' },
    ],
  },
  {
    title: 'Employee Self-Service',
    icon: UserCircle,
    path: '/self-service-hub',
    children: [
      { title: 'My Time Off', path: '/my-time-off', permission: 'MyTimeOff' },
      { title: 'Holiday Swaps', path: '/holiday-swaps', permission: 'HolidaySwaps' },
      { title: 'Time Off Activity', path: '/timeoff-activity', permission: 'TimeOffActivity' },
      { title: 'Comp Time — Request', path: '/compensatory-time/intake' },
      { title: 'Comp Time — Redeem', path: '/compensatory-time/usage' },
    ],
  },
  {
    title: 'Talent Acquisition',
    icon: UserCheck,
    path: '/hiring-hub',
    role: 'bsa',
    children: [
      { title: 'Hiring', path: '/hiring', permission: 'Hiring', role: 'bsa' },
      { title: 'Endorsements', path: '/endorsements', permission: 'Endorsements', role: 'bsa' },
    ],
  },
  {
    title: 'Project & Resource Allocation',
    icon: FolderGit2,
    path: '/project-management-hub',
    permission: 'BenchMove',
    children: [
      { title: 'Project Assignments', path: '/project-assignments', permission: 'ProjectAssignments' },
      { title: 'Bench Move', path: '/bench-move', permission: 'BenchMove' },
      { title: 'End Bench', path: '/end-bench', permission: 'BenchRemove' },
      { title: 'Clients', path: '/maintenance/clients', permission: 'Clients' },
    ],
  },
  {
    title: 'Time Off Management',
    icon: Umbrella,
    path: '/time-off-hub',
    permission: 'SupervisorTimeOff',
    children: [
      { title: 'Supervisor Time Off', path: '/supervisor-time-off', permission: 'SupervisorTimeOff' },
      { title: 'Team Holiday Swaps', path: '/supervisor-holiday-swaps', permission: 'SupervisorHolidaySwaps' },
      { title: 'Time Off Review', path: '/time-off-management', permission: 'TimeOffReview' },
      { title: 'Time Off Exception', path: '/timeoff-exception', role: 'bsa', permission: 'TimeOffException' },
      { title: 'Holiday Swap Exception', path: '/holiday-swap-exception', role: 'bsa', permission: 'HolidaySwapException' },
      { title: 'Supervisor Time Off V2', path: '/supervisor-time-off-v2', permission: 'SupervisorTimeOffV2' },
      { title: 'Comp Time — Supervisor', path: '/comp-time/supervisor', permission: 'SupervisorCompTime' },
      { title: 'Approval Management', path: '/approval-management', permission: 'SupervisorTimeOff' },
    ],
  },
  {
    title: 'Top Performers',
    icon: Star,
    path: '/top-performers-hub',
    permission: 'TopPerformers',
    children: [
      { title: 'Peer Nomination', path: '/top-performers/nominations/peer', permission: 'TopPerformers' },
      { title: 'Admin Nomination', path: '/top-performers/nominations/admin', permission: 'TopPerformers' },
      { title: 'Customer Nomination', path: '/top-performers/nominations/customer', permission: 'TopPerformers' },
      { title: 'Vote', path: '/top-performers/vote', permission: 'TopPerformers' },
      { title: 'Committee Results', path: '/top-performers/committee', permission: 'ComitatTopPerformers' },
    ],
  },
  {
    title: 'Performance Management',
    icon: Target,
    path: '/performance-management-hub',
    permission: 'PerformanceCases',
  },
  {
    title: 'Tasks',
    icon: ClipboardList,
    path: '/tasks-hub',
    permission: ['Workflow', 'StandaloneTask', 'StandaloneTaskAdmin', 'WorkflowAdmin'],
  },
  {
    title: 'Phone Contracts',
    icon: Smartphone,
    path: '/phone-contracts-hub',
    permission: 'PhoneContracts',
  },
  {
    title: 'Laptop Inventory',
    icon: Laptop,
    path: '/laptop-inventory-hub',
    permission: 'LaptopInventory',
  },
  {
    title: 'Payrol',
    icon: Wallet,
    path: '/payrol-hub',
    permission: ['PayrolManagement', 'BonusImpact'],
  },
  {
    title: 'Data & Intelligence',
    icon: BarChart2,
    path: '/reports-hub',
    permission: 'Reports',
    children: [
      { title: 'Reports', path: '/reports', permission: 'Reports' },
      { title: 'Manage Dynamic Reports', path: '/reports/dynamic', permission: 'Reports' },
    ],
  },
  {
    title: 'System Governance',
    icon: ShieldCheck,
    path: '/security-hub',
    role: 'admin',
    children: [
      { title: 'Roles', path: '/security/roles', permission: 'RBACRoles', role: 'admin' },
      { title: 'Resources', path: '/security/options', permission: 'RBACOptions', role: 'admin' },
      { title: 'Permissions Matrix', path: '/security/permissions', permission: 'RBACPermissions', role: 'admin' },
    ],
  },
  {
    title: 'Maintenance',
    icon: Database,
    path: '/maintenance-hub',
    role: 'bsa',
    children: [
      { title: 'Projects', path: '/maintenance/projects', permission: 'Projects' },
      { title: 'Team Members', path: '/maintenance/team-members', permission: 'TeamMembers' },
      { title: 'Holidays', path: '/maintenance/holidays', permission: 'Holidays' },
      { title: 'Countries', path: '/maintenance/countries', permission: 'Countries' },
      { title: 'Clients', path: '/maintenance/clients', permission: 'Clients' },
      { title: 'Functional Areas', path: '/maintenance/functional-areas', permission: 'FunctionalAreas' },
      { title: 'Users', path: '/maintenance/users', permission: 'Users' },
      { title: 'Supervisor Assignments', path: '/maintenance/supervisor-assignments', permission: 'SupervisorAssignments' },
      { title: 'Type of Time Off', path: '/maintenance/time-off-types', permission: 'TimeOffCategories' },
      { title: 'Type by Country', path: '/maintenance/category-country', permission: 'TimeOffCategoriesByCountry' },
      { title: 'Tier Bands', path: '/maintenance/tier-bands', permission: 'TierBands' },
      { title: 'Workday Info', path: '/maintenance/workday-info', permission: 'WorkdayInfo' },
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
