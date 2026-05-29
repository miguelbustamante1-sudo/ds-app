import { ChevronFirst } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useLayout } from './context';

export function SidebarHeader() {
  const { sidebarCollapse, setSidebarCollapse } = useLayout();

  const handleToggleClick = () => {
    setSidebarCollapse(!sidebarCollapse);
  };

  return (
    <div className="sidebar-header hidden lg:flex items-center relative justify-between px-3 lg:px-6 shrink-0">
      {/*
        The Link wraps both the expanded logo (default-logo) and the mini icon (small-logo).
        When the sidebar collapses, Metronic's CSS hides `.default-logo` and shows `.small-logo`.
        We use `flex items-center` so both logos are vertically centred inside the header.
        The mini logo gets `mx-auto` so it stays horizontally centred in the collapsed sidebar,
        matching the icon alignment of the menu items below.
      */}
      <Link to="/" className="flex items-center w-full">
        <div className="dark:hidden w-full flex justify-center">
          <img
            src={toAbsoluteUrl('/media/app/telus_ds_rbg.svg')}
            className="default-logo w-full h-auto max-w-none"
            alt="TELUS Digital logo"
          />
          <img
            src={toAbsoluteUrl('/media/app/telus_mini.png')}
            className="small-logo h-[22px] max-w-none"
            alt="TELUS Digital icon"
          />
        </div>
        <div className="hidden dark:flex dark:items-center dark:justify-center w-full">
          <img
            src={toAbsoluteUrl('/media/app/telus_ds_white.svg')}
            className="default-logo w-full h-auto max-w-none"
            alt="TELUS Digital logo (dark)"
          />
          <img
            src={toAbsoluteUrl('/media/app/telus_mini.png')}
            className="small-logo h-[22px] max-w-none"
            alt="TELUS Digital icon"
          />
        </div>
      </Link>
      <Button
        onClick={handleToggleClick}
        size="sm"
        mode="icon"
        variant="outline"
        className={cn(
          'size-7 absolute start-full top-2/4 rtl:translate-x-2/4 -translate-x-2/4 -translate-y-2/4',
          sidebarCollapse ? 'ltr:rotate-180' : 'rtl:rotate-180',
        )}
      >
        <ChevronFirst className="size-4!" />
      </Button>
    </div>
  );
}
