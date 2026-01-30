import { ReactNode } from 'react';
import { Calendar, Settings, Settings2, Shield, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Item1 from './notifications/item-1';
import Item2 from './notifications/item-2';
import Item3 from './notifications/item-3';
import Item4 from './notifications/item-4';
import Item5 from './notifications/item-5';
import Item6 from './notifications/item-6';
import Item10 from './notifications/item-10';
import Item11 from './notifications/item-11';
import Item13 from './notifications/item-13';
import Item14 from './notifications/item-14';
import Item15 from './notifications/item-15';
import Item16 from './notifications/item-16';
import Item17 from './notifications/item-17';
import Item18 from './notifications/item-18';
import Item19 from './notifications/item-19';
import Item20 from './notifications/item-20';

export function NotificationsSheet({ trigger }: { trigger: ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="gap-0 sm:w-[500px] inset-5 start-auto h-auto rounded-lg p-0 sm:max-w-none [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="mb-0">
          <SheetTitle className="p-3">Notifications</SheetTitle>
        </SheetHeader>
        <SheetBody className="grow p-0">
          <ScrollArea className="h-[calc(100vh-10.5rem)]">
            <Tabs defaultValue="all" className="w-full relative">
              <TabsList variant="line" className="w-full px-5 mb-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="inbox" className="relative">
                  Inbox
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 absolute top-1 -end-1" />
                </TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
                <TabsTrigger value="following">Following</TabsTrigger>
                <div className="grow flex items-center justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        mode="icon"
                        className="mb-1"
                      >
                        <Settings className="size-4.5!" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-44"
                      side="bottom"
                      align="end"
                    >
                      <DropdownMenuItem asChild>
                        <Link to="#">
                          <Users /> Invite Users
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Settings2 />
                          <span>Team Settings</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent className="w-44">
                            <DropdownMenuItem asChild>
                              <Link to="#">
                                <Shield />
                                Find Members
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to="#">
                                <Calendar /> Meetings
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to="#">
                                <Shield /> Group Settings
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                      <DropdownMenuItem asChild>
                        <Link to="#">
                          <Shield /> Group Settings
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TabsList>

              {/* All Tab */}
              <TabsContent value="all" className="mt-0">
                <div className="flex flex-col gap-5 overflow-y-auto">
                  <Item1
                    userName="Maria Santos"
                    avatar="300-4.png"
                    description="commented on your"
                    link="Time Off Request"
                    label=""
                    time="18 mins ago"
                    specialist="HR Department"
                    text="Your vacation request for Dec 23-27 has been reviewed. Please confirm the dates work with your project deadlines."
                  />
                  <div className="border-b border-b-border"></div>
                  <Item2 />
                  <div className="border-b border-b-border"></div>
                  <Item3
                    userName="Carlos Rivera"
                    avatar="300-27.png"
                    badgeColor="offline"
                    description="submitted a time off request for"
                    link="Vacation Leave"
                    day="(Jan 15-20)"
                    date="14 hours ago"
                    info="Engineering"
                  />
                  <div className="border-b border-b-border"></div>
                  <Item4 />
                  <div className="border-b border-b-border"></div>
                  <Item5
                    userName="Ana Martinez"
                    avatar="300-11.png"
                    badgeColor="online"
                    description="cancelled time off request"
                    link="Sick Leave"
                    day=""
                    date="1 hour ago"
                    info="Time Off"
                  />
                  <div className="border-b border-b-border"></div>
                  <Item6 />
                </div>
              </TabsContent>

              {/* Inbox Tab */}
              <TabsContent value="inbox" className="mt-0">
                <div className="flex flex-col gap-5">
                  <Item13 />
                  <div className="border-b border-b-border"></div>
                  <Item14 />
                  <div className="border-b border-b-border"></div>
                  <Item15 />
                  <div className="border-b border-b-border"></div>
                  <Item16 />
                  <div className="border-b border-b-border"></div>
                  <Item3
                    userName="Roberto Gomez"
                    avatar="300-30.png"
                    badgeColor="offline"
                    description="requested to change dates for"
                    link="Personal Leave"
                    day="(Feb 1-3)"
                    date="4 days ago"
                    info="Sales"
                  />
                  <div className="border-b border-b-border"></div>
                  <Item5
                    userName="Laura Chen"
                    avatar="300-24.png"
                    badgeColor="online"
                    description="approved your"
                    link="Vacation Request"
                    day=""
                    date="6 days ago"
                    info="Time Off"
                  />
                </div>
              </TabsContent>

              {/* Team Tab */}
              <TabsContent value="team" className="mt-0">
                <div className="flex flex-col gap-5">
                  <Item10 />
                  <div className="border-b border-b-border"></div>
                  <Item5
                    userName="Diego Fernandez"
                    avatar="300-6.png"
                    badgeColor="offline"
                    description="is out on"
                    link="Sick Leave"
                    day="until Jan 18"
                    date="2 days ago"
                    info="Engineering"
                  />
                  <div className="border-b border-b-border"></div>
                  <Item11 />
                  <div className="border-b border-b-border"></div>
                  <Item1
                    userName="Patricia Reyes"
                    avatar="300-21.png"
                    description="needs coverage for"
                    link="Time Off Request"
                    label=""
                    time="4 days ago"
                    specialist="Manager"
                    text="I'll be on vacation from Feb 10-17. Can someone cover the weekly standup meetings during my absence?"
                  />
                  <div className="border-b border-b-border"></div>
                  <Item3
                    userName="Miguel Torres"
                    avatar="300-13.png"
                    badgeColor="online"
                    description="submitted emergency leave for"
                    link="Family Emergency"
                    day="(Jan 20-22)"
                    date="4 days ago"
                    info="Operations"
                  />
                </div>
              </TabsContent>

              {/* Following Tab */}
              <TabsContent value="following" className="mt-0">
                <div className="flex flex-col gap-5">
                  <Item18 />
                  <div className="border-b border-b-border"></div>
                  <Item17 />
                  <div className="border-b border-b-border"></div>
                  <Item19 />
                  <div className="border-b border-b-border"></div>
                  <Item5
                    userName="Sofia Hernandez"
                    avatar="300-34.png"
                    badgeColor="online"
                    description="denied time off request"
                    link="Vacation Leave"
                    day=""
                    date="1 day ago"
                    info="Time Off"
                  />
                  <div className="border-b border-b-border"></div>
                  <Item20 />
                  <div className="border-b border-b-border"></div>
                  <Item3
                    userName="Elena Rodriguez"
                    avatar="300-13.png"
                    badgeColor="offline"
                    description="requested time off for"
                    link="Medical Appointment"
                    day="(Jan 25)"
                    date="4 days ago"
                    info="HR"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="border-t border-border p-5 grid grid-cols-2 gap-2.5">
          <Button variant="outline">Archive all</Button>
          <Button variant="outline">Mark all as read</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
