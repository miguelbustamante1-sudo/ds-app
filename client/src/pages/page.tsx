import { useState } from 'react';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { format } from 'date-fns';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TeamMembersByCountryChart } from '@/components/charts/team-members-by-country-chart';
import { TeamTimeOffByMonthChart } from '@/components/charts/team-timeoff-by-month-chart';
import { TeamTimeOffCurrentMonthCard } from '@/components/charts/team-timeoff-current-month-card';
import { TeamTimeOffByCountryChart } from '@/components/charts/team-timeoff-by-country-chart';
import { TimeOffActivityFeed } from '@/components/charts/TimeOffActivityFeed';
import {
  DATE_RANGE_PRESETS,
  loadDateRangeFromStorage,
  saveDateRangeToStorage,
  clearDateRangeStorage,
  getCurrentQuarterRange,
} from '@/lib/dateRange';

function getInitialDateRange(): DateRange {
  const stored = loadDateRangeFromStorage();
  return stored ?? getCurrentQuarterRange();
}

export function Layout1Page() {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState<DateRange | undefined>(getInitialDateRange);
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(
    date,
  );

  const handlePresetSelect = (getValue: () => DateRange) => {
    const newRange = getValue();
    setDate(newRange);
    setTempDateRange(newRange);
    saveDateRangeToStorage(newRange);
  };

  const handleDateRangeApply = () => {
    setDate(tempDateRange);
    if (tempDateRange) {
      saveDateRangeToStorage(tempDateRange);
    }
    setIsOpen(false);
  };

  const handleDateRangeReset = () => {
    clearDateRangeStorage();
    const defaultRange = getCurrentQuarterRange();
    setDate(defaultRange);
    setTempDateRange(defaultRange);
    setIsOpen(false);
  };

  const defaultStartDate = new Date();

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Dashboard</ToolbarPageTitle>
          <ToolbarDescription>Central Hub for Information</ToolbarDescription>
        </ToolbarHeading>
        <ToolbarActions>
          {/* Preset dropdown for small screens */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex md:hidden">
                Quick Select
                <ChevronDown size={16} className="ms-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {DATE_RANGE_PRESETS.map((preset) => (
                <DropdownMenuItem
                  key={preset.label}
                  onClick={() => handlePresetSelect(preset.getValue)}
                >
                  {preset.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Preset buttons for normal screens */}
          <div className="hidden md:flex gap-1.5">
            {DATE_RANGE_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                onClick={() => handlePresetSelect(preset.getValue)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Date range picker popover */}
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button id="date" variant="outline">
                <CalendarDays size={16} className="me-0.5" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, 'LLL dd, y')} -{' '}
                      {format(date.to, 'LLL dd, y')}
                    </>
                  ) : (
                    format(date.from, 'LLL dd, y')
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={tempDateRange?.from || defaultStartDate}
                selected={tempDateRange}
                onSelect={setTempDateRange}
                numberOfMonths={2}
              />
              <div className="flex items-center justify-end gap-1.5 border-t border-border p-3">
                <Button variant="outline" onClick={handleDateRangeReset}>
                  Reset
                </Button>
                <Button onClick={handleDateRangeApply}>Apply</Button>
              </div>
            </PopoverContent>
          </Popover>
        </ToolbarActions>
      </Toolbar>

      {/* Cards row */}
      <div className="grid gap-5 lg:grid-cols-3 mb-5">
        <TeamTimeOffCurrentMonthCard />
      </div>

      {/* Charts row */}
      <div className="grid gap-5 lg:grid-cols-2 mb-5">
        <TeamMembersByCountryChart />
        <TeamTimeOffByMonthChart
          key={`month-${date?.from?.getTime() ?? 'no-start'}-${date?.to?.getTime() ?? 'no-end'}`}
          startDate={date?.from}
          endDate={date?.to}
        />
      </div>

      {/* Time Off by Country row */}
      <div className="grid gap-5 lg:grid-cols-1 mb-5">
        <TeamTimeOffByCountryChart
          key={`${date?.from?.getTime() ?? 'no-start'}-${date?.to?.getTime() ?? 'no-end'}`}
          startDate={date?.from}
          endDate={date?.to}
        />
      </div>

      {/* Time Off Activity Feed */}
      <div className="grid gap-5 lg:grid-cols-1 mb-5">
        <TimeOffActivityFeed />
      </div>
    </div>
  );
}
