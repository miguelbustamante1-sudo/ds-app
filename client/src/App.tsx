import { AppRouting } from '@/routing/app-routing';
import { ThemeProvider } from 'next-themes';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { LoadingBarContainer } from 'react-top-loading-bar';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/auth/auth-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { BASE_URL } = import.meta.env;

const queryClient = new QueryClient();

export function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      storageKey="vite-theme"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <LoadingBarContainer>
            <BrowserRouter basename={BASE_URL}>
              <AuthProvider>
                <Toaster />
                <AppRouting />
              </AuthProvider>
            </BrowserRouter>
          </LoadingBarContainer>
        </QueryClientProvider>
      </HelmetProvider>
    </ThemeProvider>
  );
}
