type StatusVariant = 'primary' | 'secondary' | 'destructive' | 'outline';

export function getStatusBadgeProps(
  statusId: number | null,
  defaultVariant: StatusVariant = 'primary',
): { variant: StatusVariant; className?: string } {
  switch (statusId) {
    case 1: // Tentative
      return { variant: 'outline', className: 'border-uds-system-amber-400 text-uds-system-amber-600 bg-uds-system-amber-100' };
    case 2: // Acknowledged / Approved
      return { variant: 'outline', className: 'border-uds-system-green-500 text-uds-system-green-600 bg-uds-system-green-100' };
    case 3: // Taken
      return { variant: 'primary' };
    case 4: // Cancelled
      return { variant: 'secondary' };
    case 5: // Rejected
      return { variant: 'destructive' };
    default:
      return { variant: defaultVariant };
  }
}
