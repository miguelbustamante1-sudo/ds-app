import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useDataGrid } from '@/components/ui/data-grid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataGridPaginationLeftInfoProps {
  sizes?: number[];
  sizesInfo?: string;
  sizesLabel?: string;
  sizesDescription?: string;
  sizesSkeleton?: ReactNode;
  more?: boolean;
  moreLimit?: number;
  info?: string;
  infoSkeleton?: ReactNode;
  className?: string;
}

function DataGridPaginationLeftInfo(props: DataGridPaginationLeftInfoProps) {
  const { table, recordCount, isLoading } = useDataGrid();

  const defaultProps: Partial<DataGridPaginationLeftInfoProps> = {
    sizes: [5, 10, 25, 50, 100],
    sizesLabel: 'Show',
    sizesDescription: 'per page',
    sizesSkeleton: <Skeleton className="h-8 w-44" />,
    moreLimit: 5,
    more: false,
    info: '{from} - {to} of {count}',
    infoSkeleton: <Skeleton className="h-8 w-60" />,
  };

  const mergedProps: DataGridPaginationLeftInfoProps = { ...defaultProps, ...props };

  const btnBaseClasses = 'size-7 p-0 text-sm';
  const btnArrowClasses = btnBaseClasses + ' rtl:transform rtl:rotate-180';
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const from = pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, recordCount);
  const pageCount = table.getPageCount();

  const paginationInfo = mergedProps?.info
    ? mergedProps.info
        .replace('{from}', from.toString())
        .replace('{to}', to.toString())
        .replace('{count}', recordCount.toString())
    : `${from} - ${to} of ${recordCount}`;

  const paginationMoreLimit = mergedProps?.moreLimit || 5;

  const currentGroupStart = Math.floor(pageIndex / paginationMoreLimit) * paginationMoreLimit;
  const currentGroupEnd = Math.min(currentGroupStart + paginationMoreLimit, pageCount);

  const renderPageButtons = () => {
    const buttons = [];
    for (let i = currentGroupStart; i < currentGroupEnd; i++) {
      buttons.push(
        <Button
          key={i}
          size="sm"
          mode="icon"
          variant="ghost"
          className={cn(btnBaseClasses, 'text-muted-foreground', {
            'bg-accent text-accent-foreground': pageIndex === i,
          })}
          onClick={() => {
            if (pageIndex !== i) {
              table.setPageIndex(i);
            }
          }}
        >
          {i + 1}
        </Button>,
      );
    }
    return buttons;
  };

  const renderEllipsisPrevButton = () => {
    if (currentGroupStart > 0) {
      return (
        <Button
          size="sm"
          mode="icon"
          className={btnBaseClasses}
          variant="ghost"
          onClick={() => table.setPageIndex(currentGroupStart - 1)}
        >
          ...
        </Button>
      );
    }
    return null;
  };

  const renderEllipsisNextButton = () => {
    if (currentGroupEnd < pageCount) {
      return (
        <Button
          className={btnBaseClasses}
          variant="ghost"
          size="sm"
          mode="icon"
          onClick={() => table.setPageIndex(currentGroupEnd)}
        >
          ...
        </Button>
      );
    }
    return null;
  };

  return (
    <div
      data-slot="data-grid-pagination"
      className={cn(
        'flex flex-wrap flex-col sm:flex-row justify-start items-center gap-2.5 py-2.5 sm:py-0 grow',
        mergedProps?.className,
      )}
    >
      {/* Left side: rows-per-page selector + page info text + page navigation */}
      <div className="flex flex-wrap items-center gap-2.5 pb-2.5 sm:pb-0">
        {isLoading ? (
          mergedProps?.sizesSkeleton
        ) : (
          <>
            <div className="text-sm text-muted-foreground">Rows per page</div>
            <Select
              value={`${pageSize}`}
              indicatorPosition="right"
              onValueChange={(value) => {
                const newPageSize = Number(value);
                table.setPageSize(newPageSize);
              }}
            >
              <SelectTrigger className="w-fit" size="sm">
                <SelectValue placeholder={`${pageSize}`} />
              </SelectTrigger>
              <SelectContent side="top" className="min-w-[50px]">
                {mergedProps?.sizes?.map((size: number) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground text-nowrap">{paginationInfo}</div>
            {pageCount > 1 && (
              <div className="flex items-center space-x-1">
                <Button
                  size="sm"
                  mode="icon"
                  variant="ghost"
                  className={btnArrowClasses}
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeftIcon className="size-4" />
                </Button>

                {renderEllipsisPrevButton()}

                {renderPageButtons()}

                {renderEllipsisNextButton()}

                <Button
                  size="sm"
                  mode="icon"
                  variant="ghost"
                  className={btnArrowClasses}
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export { DataGridPaginationLeftInfo, type DataGridPaginationLeftInfoProps };
