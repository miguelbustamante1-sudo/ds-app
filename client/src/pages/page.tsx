import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';

export function Layout1Page() {
  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Dashboard</ToolbarPageTitle>
          <ToolbarDescription>Central Hub for Information</ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>

      {/* Looker Studio Report */}
      <div className="mb-5 w-full" style={{ height: 'calc(100vh - 160px)' }}>
        <iframe
          width="100%"
          height="100%"
          src="https://lookerstudio.google.com/embed/reporting/745adfe2-7ca4-41a7-af4c-eea697c72b34/page/7hEtF"
          style={{ border: 0 }}
          allowFullScreen
          sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    </div>
  );
}
