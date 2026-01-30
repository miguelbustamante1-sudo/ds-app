'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
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
import { TeamMemberDTO } from '@shared/dto/TeamMember';
import { CountryDTO } from '@shared/dto/Country';

interface ChartData {
  country: string;
  count: number;
}

const chartConfig = {
  count: {
    label: 'Team Members',
    color: 'hsl(142, 76%, 36%)',
  },
} satisfies ChartConfig;

export function TeamMembersByCountryChart() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [teamMembers, countries] = await Promise.all([
          apiGet<TeamMemberDTO[]>('/api/team-members'),
          apiGet<CountryDTO[]>('/api/countries'),
        ]);

        const countryMap = new Map<number, string>();
        countries.forEach((country) => {
          countryMap.set(country.countryId, country.countryName);
        });

        const countByCountry = new Map<string, number>();
        teamMembers.forEach((member) => {
          const countryName = member.countryId
            ? countryMap.get(member.countryId) || 'Unknown'
            : 'Unknown';
          countByCountry.set(
            countryName,
            (countByCountry.get(countryName) || 0) + 1
          );
        });

        const data: ChartData[] = Array.from(countByCountry.entries())
          .map(([country, count]) => ({ country, count }))
          .sort((a, b) => b.count - a.count);

        setChartData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Members by Country</CardTitle>
          <CardDescription>Distribution across countries</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Members by Country</CardTitle>
          <CardDescription>Distribution across countries</CardDescription>
        </CardHeader>
        <CardContent>
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
        <CardHeader>
          <CardTitle>Team Members by Country</CardTitle>
          <CardDescription>Distribution across countries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Members by Country</CardTitle>
        <CardDescription>Distribution across countries</CardDescription>
      </CardHeader>
      <CardContent>
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
              dataKey="count"
              fill="var(--color-count)"
              radius={[0, 4, 4, 0]}
            >
              <LabelList
                dataKey="count"
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
