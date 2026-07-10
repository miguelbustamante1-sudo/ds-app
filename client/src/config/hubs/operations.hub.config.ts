import { HubConfig } from "./hub.types";

export const operationsHubConfig: HubConfig = {
  key: "operations",
  title: "Operations & Administration",
  subtitle: "System administration, data management, and configuration tools.",
  buttons: [
    {
      title: "Template Builder",
      description:
        "Build and manage document templates used across the system.",
      path: "/template-builder",
      permission: "PersistenceTables",
    },
    {
      title: "Data Import",
      description: "Import and validate bulk data into the system.",
      path: "/data-import",
      permission: "PersistenceTables",
    },
    {
      title: "Maintenance",
      description:
        "Manage system configuration tables, lookups, and reference data.",
      path: "/maintenance-hub",
      role: "bsa",
    },
    {
      title: "Security",
      description:
        "Manage roles, permissions, and access control for all users.",
      path: "/security-hub",
      role: "admin",
    },
    {
      title: "Run Procedure",
      description: "Run an approved stored procedure against the database.",
      path: "/stored-procedures/run",
      permission: "StoredProcedureRun",
    },
    {
      title: "Manage Procedures",
      description: "Register and manage the stored procedure catalog.",
      path: "/admin/stored-procedures",
      role: "admin",
      permission: "StoredProcedureRun",
    },
  ],
};
