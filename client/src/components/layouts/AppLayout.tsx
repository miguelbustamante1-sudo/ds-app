import { Helmet } from 'react-helmet-async';
import { LayoutProvider } from './components/context';
import { Main } from './components/main';
import { Toaster } from '@/components/ui/toaster';

export function AppLayout() {
  return (
    <>
      <Helmet>
        <title>Digital Solutions BSA App</title>
      </Helmet>

      <LayoutProvider>
        <Main />
      </LayoutProvider>
      <Toaster />
    </>
  );
}
