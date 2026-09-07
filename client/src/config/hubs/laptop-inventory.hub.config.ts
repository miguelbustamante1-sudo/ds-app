import { HubConfig } from './hub.types';

export const laptopInventoryHubConfig: HubConfig = {
  key: 'laptop-inventory',
  title: 'Laptop Inventory',
  subtitle: 'Manage company laptops and device assignments.',
  buttons: [
    {
      title: 'Laptop Inventory',
      description: 'View and manage company laptops, their assignments, and device details.',
      path: '/laptop-inventory',
      permission: 'LaptopInventory',
    },
  ],
};
