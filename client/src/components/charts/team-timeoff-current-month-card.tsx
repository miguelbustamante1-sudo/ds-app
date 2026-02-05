'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarDays, Users } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeamTimeOffCurrentMonth } from '@/hooks/useSupervisorTimeOff';

export function TeamTimeOffCurrentMonthCard() {
  const { data, loading, error, loadData } = useTeamTimeOffCurrentMonth();

  useEffect(() => {
    loadData();
  }, []);

  const currentMonthName = format(new Date(), 'MMMM yyyy');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Time Off - {currentMonthName}</CardTitle>
          <CardDescription>Time off scheduled for this month</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Time Off - {currentMonthName}</CardTitle>
          <CardDescription>Time off scheduled for this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            Failed to load data: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Time Off - {currentMonthName}</CardTitle>
          <CardDescription>Time off scheduled for this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Team Time Off - {currentMonthName}</CardTitle>
        <CardDescription>Time off scheduled for this month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.totalDays}</p>
              <p className="text-xs text-muted-foreground">Total Days</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.teamMembersCount}</p>
              <p className="text-xs text-muted-foreground">Team Members</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
