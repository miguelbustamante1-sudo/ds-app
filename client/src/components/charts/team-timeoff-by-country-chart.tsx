'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGet } from '@/lib/api';
import { TimeOffByCountryDTO } from '@shared/dto/TimeOff';

interface TeamTimeOffByCountryChartProps {
  startDate?: Date;
  endDate?: Date;
}

interface ChartData {
  country: string;
  days: number;
}

const chartConfig = {
  days: {
    label: 'Days Off',
    color: '#4B286D',
  },
} satisfies ChartConfig;

export function TeamTimeOffByCountryChart({ startDate, endDate }: TeamTimeOffByCountryChartProps) {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (startDate) {
          params.append('startDate', startDate.toISOString());
        }
        if (endDate) {
          params.append('endDate', endDate.toISOString());
        }
        const queryString = params.toString();
        const url = `/api/time-offs/supervisor/team-timeoff-by-country${queryString ? `?${queryString}` : ''}`;

        const data = await apiGet<TimeOffByCountryDTO[]>(url);
        setChartData(data.map((item) => ({
          country: item.country,
          days: item.days,
        })));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [startDate, endDate]);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <CardTitle>Team Time Off by Country</CardTitle>
          <CardDescription className="mb-4">Time off distribution across countries</CardDescription>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <CardTitle>Team Time Off by Country</CardTitle>
          <CardDescription className="mb-4">Time off distribution across countries</CardDescription>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            Failed to load data: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent>
          <CardTitle>Team Time Off by Country</CardTitle>
          <CardDescription className="mb-4">Time off distribution across countries</CardDescription>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <CardTitle>Team Time Off by Country</CardTitle>
        <CardDescription className="mb-4">Time off distribution across countries</CardDescription>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 0, right: 16 }}
          >
            <XAxis type="number" hide />
            <YAxis
              dataKey="country"
              type="category"
              tickLine={false}
              axisLine={false}
              width={100}
              tickFormatter={(value) =>
                value.length > 12 ? `${value.slice(0, 12)}...` : value
              }
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar
              dataKey="days"
              fill="var(--color-days)"
              radius={[0, 4, 4, 0]}
            >
              <LabelList
                dataKey="days"
                position="right"
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
