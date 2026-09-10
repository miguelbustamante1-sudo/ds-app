import { APP_VERSION } from '@/config/general.config';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-center md:justify-between items-center gap-3 py-5">
          <div className="flex order-2 md:order-1  gap-2 font-normal text-sm">
            <span className="text-muted-foreground">{currentYear} &copy;</span>
            <a
              href="/"
              target="_blank"
              className="text-secondary-foreground hover:text-primary"
            >
              Digital Solutions
            </a>
          </div>
          <div className="flex order-1 md:order-2 font-normal text-sm">
            <span className="text-muted-foreground">v{APP_VERSION}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
