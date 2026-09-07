import { Bell, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface GenericItemProps {
  title?: string;
  message?: string;
  link?: string | null;
  timeDisplay?: string;
  itemType?: string;
  actionType?: string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  SYSTEM_ALERT: <AlertTriangle className="size-4 text-warning" />,
  TASK_REMINDER: <Bell className="size-4 text-primary" />,
  INFO: <Info className="size-4 text-info" />,
  SUCCESS: <CheckCircle className="size-4 text-success" />,
};

export default function GenericNotificationItem({
  title,
  message,
  link,
  timeDisplay,
  itemType,
}: GenericItemProps) {
  const icon = (itemType && ICON_MAP[itemType]) ?? <Bell className="size-4 text-muted-foreground" />;

  return (
    <div className="flex grow gap-3 px-5 py-3.5">
      <div className="flex items-start pt-0.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        {title && (
          <span className="text-sm font-semibold text-mono leading-snug">
            {title}
          </span>
        )}
        {message && (
          <span className="text-sm text-secondary-foreground leading-snug line-clamp-2">
            {message}
          </span>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          {timeDisplay && (
            <span className="text-xs text-muted-foreground">{timeDisplay}</span>
          )}
          {link && (
            <>
              <span className="rounded-full size-1 bg-mono/30" />
              <Link
                to={link}
                className="text-xs text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View details
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
