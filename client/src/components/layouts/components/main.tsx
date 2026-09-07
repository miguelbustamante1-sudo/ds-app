import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLayout } from './context';
import { Footer } from './footer';
import { Header } from './header';
import { InsightStrip } from './InsightStrip';
import { Sidebar } from './sidebar';
import { SidebarMenu } from './sidebar-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export function Main() {
  const isMobile = useIsMobile();
  const { sidebarCollapse, mobileMenuOpen, setMobileMenuOpen } = useLayout();

  useEffect(() => {
    const bodyClass = document.body.classList;

    if (sidebarCollapse) {
      bodyClass.add('sidebar-collapse');
    } else {
      bodyClass.remove('sidebar-collapse');
    }
  }, [sidebarCollapse]);

  useEffect(() => {
    const bodyClass = document.body.classList;

    bodyClass.add('demo1');
    bodyClass.add('sidebar-fixed');
    bodyClass.add('header-fixed');

    const timer = setTimeout(() => {
      bodyClass.add('layout-initialized');
    }, 1000);

    return () => {
      bodyClass.remove('demo1');
      bodyClass.remove('sidebar-fixed');
      bodyClass.remove('sidebar-collapse');
      bodyClass.remove('header-fixed');
      bodyClass.remove('layout-initialized');
      clearTimeout(timer);
    };
  }, []);

  return (
    <>
      {!isMobile && <Sidebar />}

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[280px] p-0 overflow-y-auto">
          <SheetHeader className="px-5 pt-5 pb-2">
            <SheetTitle>Navegación</SheetTitle>
          </SheetHeader>
          <SidebarMenu />
        </SheetContent>
      </Sheet>

      <div className="wrapper flex grow flex-col">
        <Header />
        <InsightStrip />

        <main className="grow pt-5" role="content">
          <Outlet />
        </main>

        <Footer />
      </div>
    </>
  );
}
