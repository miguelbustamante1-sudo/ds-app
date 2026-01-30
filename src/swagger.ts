export const openapiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Cloud OK API',
    version: '1.0.0',
    description: 'OpenAPI specification for the Cloud OK API',
  },
  servers: [
    {
      url: '/',
      description: 'Relative server URL (configured by Cloud Run)',
    },
  ],
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'System', description: 'Health and debug endpoints' },
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Countries', description: 'Country CRUD endpoints' },
    { name: 'Regions', description: 'Region endpoints' },
    { name: 'TimeOffCategories', description: 'Time off category endpoints' },
    { name: 'TimeOffs', description: 'Time off CRUD endpoints' },
    { name: 'TimeOffCategoriesByCountry', description: 'Time off categories by country endpoints' },
    { name: 'TeamMembers', description: 'Team member CRUD endpoints' },
    { name: 'TeamMemberProjects', description: 'Team member project CRUD endpoints' },
    { name: 'Projects', description: 'Project CRUD endpoints' },
    { name: 'Roles', description: 'Role CRUD endpoints' },
    { name: 'Users', description: 'User CRUD endpoints' },
    { name: 'RBACPermissions', description: 'RBAC permission endpoints' },
    { name: 'RBACRoles', description: 'RBAC role endpoints' },
    { name: 'RBACRolePermissions', description: 'RBAC role-permission endpoints' },
    { name: 'RBACUserRoles', description: 'RBAC user-role endpoints' },
  ],
  paths: {
    '/api/ping': {
      get: {
        tags: ['System'],
        summary: 'Ping endpoint',
        security: [],
        responses: {
          '200': {
            description: 'pong',
            content: {
              'text/plain': {
                schema: { type: 'string' },
              },
            },
          },
        },
      },
    },
    '/api/dbhealth': {
      get: {
        tags: ['System'],
        summary: 'Database health check',
        security: [],
        responses: {
          '200': { description: 'DB reachable' },
          '503': { description: 'DB unreachable' },
        },
      },
    },
    '/api/auth/exchange-code': {
      post: {
        tags: ['Auth'],
        summary: 'Exchange authorization code for tokens',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                },
                required: ['code'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token exchange response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthExchangeResponse' },
              },
            },
          },
          '400': { description: 'Authorization code is required' },
          '401': { description: 'Token validation failed' },
          '500': { description: 'Failed to exchange code' },
        },
      },
    },
    '/api/auth/login': {
      get: {
        tags: ['Auth'],
        summary: 'Redirect to OneLogin authorization endpoint',
        security: [],
        responses: {
          '302': { description: 'Redirect to OneLogin' },
          '500': { description: 'Missing OneLogin configuration' },
        },
      },
    },
    '/api/auth/callback': {
      get: {
        tags: ['Auth'],
        summary: 'Handle OneLogin authorization callback',
        security: [],
        parameters: [
          {
            name: 'code',
            in: 'query',
            required: false,
            schema: { type: 'string' },
          },
          {
            name: 'state',
            in: 'query',
            required: false,
            schema: { type: 'string' },
          },
          {
            name: 'error',
            in: 'query',
            required: false,
            schema: { type: 'string' },
          },
          {
            name: 'error_description',
            in: 'query',
            required: false,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Token exchange response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthExchangeResponse' },
              },
            },
          },
          '302': { description: 'Redirect to post-login URL' },
          '400': { description: 'Invalid request or state' },
          '401': { description: 'Authorization error' },
          '500': { description: 'Failed to handle callback' },
        },
      },
    },
    '/api/auth/verify': {
      post: {
        tags: ['Auth'],
        summary: 'Verify current token',
        responses: {
          '200': {
            description: 'Token valid',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    valid: { type: 'boolean' },
                    user: { $ref: '#/components/schemas/AuthUser' },
                  },
                  required: ['valid', 'user'],
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '500': { description: 'Authentication failed' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user info',
        responses: {
          '200': {
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthUser' } },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout current user',
        responses: {
          '200': {
            description: 'Logged out',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                  },
                  required: ['message'],
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string' },
                },
                required: ['refreshToken'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Access token refreshed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    expiresIn: { type: 'integer' },
                  },
                  required: ['accessToken', 'expiresIn'],
                },
              },
            },
          },
          '400': { description: 'Refresh token is required' },
          '500': { description: 'Failed to refresh token' },
        },
      },
    },
    '/api/countries': {
      get: {
        tags: ['Countries'],
        summary: 'List countries',
        parameters: [
          {
            name: 'reg_id',
            in: 'query',
            required: false,
            schema: { type: 'integer' },
            description: 'Filter by region id',
          },
        ],
        responses: {
          '200': {
            description: 'An array of countries',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Country' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Countries'],
        summary: 'Create country',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Country' },
            },
          },
        },
        responses: {
          '201': { description: 'Country created' },
        },
      },
    },
    '/api/countries/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      get: {
        tags: ['Countries'],
        summary: 'Get country by id',
        responses: {
          '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Country' } } } },
          '404': { description: 'Not found' },
        },
      },
      put: {
        tags: ['Countries'],
        summary: 'Update country',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Country' } } },
        },
        responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } },
      },
      delete: {
        tags: ['Countries'],
        summary: 'Delete country',
        responses: { '204': { description: 'Deleted' } },
      },
    },
    '/api/countries/{id}/team-members': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      get: {
        tags: ['Countries'],
        summary: 'List team members for a country',
        responses: {
          '200': {
            description: 'An array of team members',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/TeamMember' } },
              },
            },
          },
          '400': { description: 'Invalid id' },
        },
      },
    },
    '/api/regions': {
      get: {
        tags: ['Regions'],
        summary: 'List regions',
        responses: { '200': { description: 'List of regions' } },
      },
      post: {
        tags: ['Regions'],
        summary: 'Create region',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Region' } } },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/regions/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      get: {
        tags: ['Regions'],
        summary: 'Get region by id',
        responses: {
          '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Region' } } } },
          '404': { description: 'Not found' },
        },
      },
      put: {
        tags: ['Regions'],
        summary: 'Update region',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Region' } } },
        },
        responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } },
      },
      delete: {
        tags: ['Regions'],
        summary: 'Delete region',
        responses: { '204': { description: 'Deleted' } },
      },
    },
    '/api/regions/{id}/countries': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      get: {
        tags: ['Regions'],
        summary: 'List countries for a region',
        responses: {
          '200': {
            description: 'An array of countries',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Country' } },
              },
            },
          },
          '400': { description: 'Invalid id' },
        },
      },
    },
    '/api/time-off-category': {
      get: {
        tags: ['TimeOffCategories'],
        summary: 'List time-off-category',
        responses: {
          '200': {
            description: 'An array of categories',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/TimeOffCategory' } }
              }
            }
          }
        }
      },
      post: {
        tags: ['TimeOffCategories'],
        summary: 'Create a category',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TimeOffCategory' } } } },
        responses: { '201': { description: 'Created' } }
      }
    },
    '/api/time-off-category/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      get: { tags: ['TimeOffCategories'], summary: 'Get category by id', responses: { '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/TimeOffCategory' } } } }, '404': { description: 'Not found' } } },
      put: { tags: ['TimeOffCategories'], summary: 'Update category', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TimeOffCategory' } } } }, responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } } },
      delete: { tags: ['TimeOffCategories'], summary: 'Delete category', responses: { '204': { description: 'Deleted' } } }
    },
    '/api/time-off-categories-by-country': {
      get: {
        tags: ['TimeOffCategoriesByCountry'],
        summary: 'List time-off-category by country',
        responses: {
          '200': {
            description: 'An array of category-by-country rows',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/TimeOffCategoryXCountry' } }
              }
            }
          }
        }
      },
      post: {
        tags: ['TimeOffCategoriesByCountry'],
        summary: 'Create a time-off-category-by-country row',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TimeOffCategoryXCountry' } } } },
        responses: { '201': { description: 'Created' } }
      }
    },
    '/api/time-off-categories-by-country/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      get: { tags: ['TimeOffCategoriesByCountry'], summary: 'Get row by id', responses: { '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/TimeOffCategoryXCountry' } } } }, '404': { description: 'Not found' } } },
      put: { tags: ['TimeOffCategoriesByCountry'], summary: 'Update row', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TimeOffCategoryXCountry' } } } }, responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } } },
      delete: { tags: ['TimeOffCategoriesByCountry'], summary: 'Delete row', responses: { '204': { description: 'Deleted' } } }
    },
    '/api/time-off-categories-by-country/country/{cou_id}': {
      parameters: [{ name: 'cou_id', in: 'path', required: true, schema: { type: 'integer' } }],
      get: { tags: ['TimeOffCategoriesByCountry'], summary: 'List rows for a country', responses: { '200': { content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/TimeOffCategoryXCountry' } } } } } } }
    },
    '/api/time-offs': {
      get: {
        tags: ['TimeOffs'],
        summary: 'List time offs',
        responses: {
          '200': {
            description: 'An array of time offs',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/TimeOff' } }
              }
            }
          }
        }
      },
      post: {
        tags: ['TimeOffs'],
        summary: 'Create a time off',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TimeOff' } } } },
        responses: { '201': { description: 'Created' } }
      }
    },
    '/api/time-offs/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      get: { tags: ['TimeOffs'], summary: 'Get time off by id', responses: { '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/TimeOff' } } } }, '404': { description: 'Not found' } } },
      put: { tags: ['TimeOffs'], summary: 'Update time off', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TimeOff' } } } }, responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } } },
      delete: { tags: ['TimeOffs'], summary: 'Delete time off', responses: { '204': { description: 'Deleted' } } }
    },
    '/api/time-offs/team-member/{tms_id}': {
      parameters: [{ name: 'tms_id', in: 'path', required: true, schema: { type: 'integer' } }],
      get: { tags: ['TimeOffs'], summary: 'List time offs for a team member', responses: { '200': { content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/TimeOff' } } } } } } }
    },
    '/api/team-member-projects': {
      get: {
        tags: ['TeamMemberProjects'],
        summary: 'List team member projects',
        responses: {
          '200': {
            description: 'An array of team member projects',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/TeamMemberProject' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['TeamMemberProjects'],
        summary: 'Create team member project',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TeamMemberProject' },
            },
          },
        },
        responses: {
          '201': { description: 'Team member project created' },
        },
      },
    },
    '/api/team-member-projects/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      get: {
        tags: ['TeamMemberProjects'],
        summary: 'Get team member project by id',
        responses: {
          '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/TeamMemberProject' } } } },
          '404': { description: 'Not found' },
        },
      },
      put: {
        tags: ['TeamMemberProjects'],
        summary: 'Update team member project',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TeamMemberProject' } } },
        },
        responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } },
      },
      delete: {
        tags: ['TeamMemberProjects'],
        summary: 'Delete team member project',
        responses: { '204': { description: 'Deleted' } },
      },
    },
    '/api/team-member-projects/team-member/{tms_id}': {
      parameters: [
        { name: 'tms_id', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      get: {
        tags: ['TeamMemberProjects'],
        summary: 'List team member projects for a team member',
        responses: {
          '200': { content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/TeamMemberProject' } } } } },
        },
      },
    },
    '/api/team-member-projects/project/{pro_id}': {
      parameters: [
        { name: 'pro_id', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      get: {
        tags: ['TeamMemberProjects'],
        summary: 'List team member projects for a project',
        responses: {
          '200': { content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/TeamMemberProject' } } } } },
        },
      },
    },
    '/api/projects': {
      get: {
        tags: ['Projects'],
        summary: 'List projects',
        responses: {
          '200': {
            description: 'An array of projects',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Project' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Projects'],
        summary: 'Create project',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Project' },
            },
          },
        },
        responses: {
          '201': { description: 'Project created' },
        },
      },
    },
    '/api/projects/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      get: {
        tags: ['Projects'],
        summary: 'Get project by id',
        responses: {
          '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Project' } } } },
          '404': { description: 'Not found' },
        },
      },
      put: {
        tags: ['Projects'],
        summary: 'Update project',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Project' } } },
        },
        responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } },
      },
      delete: {
        tags: ['Projects'],
        summary: 'Delete project',
        responses: { '204': { description: 'Deleted' } },
      },
    },
    '/api/roles': {
      get: {
        tags: ['Roles'],
        summary: 'List roles',
        responses: {
          '200': {
            description: 'An array of roles',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Role' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Roles'],
        summary: 'Create role',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Role' },
            },
          },
        },
        responses: {
          '201': { description: 'Role created' },
        },
      },
    },
    '/api/roles/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      get: {
        tags: ['Roles'],
        summary: 'Get role by id',
        responses: {
          '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Role' } } } },
          '404': { description: 'Not found' },
        },
      },
      put: {
        tags: ['Roles'],
        summary: 'Update role',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Role' } } },
        },
        responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } },
      },
      delete: {
        tags: ['Roles'],
        summary: 'Delete role',
        responses: { '204': { description: 'Deleted' } },
      },
    },
    '/api/rbac/permissions': {
      get: {
        tags: ['RBACPermissions'],
        summary: 'List permissions',
        responses: {
          '200': {
            description: 'An array of permissions',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/RbacPermission' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['RBACPermissions'],
        summary: 'Create permission',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RbacPermission' },
            },
          },
        },
        responses: { '201': { description: 'Permission created' } },
      },
    },
    '/api/rbac/permissions/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      get: {
        tags: ['RBACPermissions'],
        summary: 'Get permission by id',
        responses: {
          '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/RbacPermission' } } } },
          '404': { description: 'Not found' },
        },
      },
      put: {
        tags: ['RBACPermissions'],
        summary: 'Update permission',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RbacPermission' } } },
        },
        responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } },
      },
      delete: {
        tags: ['RBACPermissions'],
        summary: 'Delete permission',
        responses: { '204': { description: 'Deleted' } },
      },
    },
    '/api/rbac/roles': {
      get: {
        tags: ['RBACRoles'],
        summary: 'List RBAC roles',
        responses: {
          '200': {
            description: 'An array of RBAC roles',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/RbacRole' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['RBACRoles'],
        summary: 'Create RBAC role',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RbacRole' },
            },
          },
        },
        responses: { '201': { description: 'RBAC role created' } },
      },
    },
    '/api/rbac/roles/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      get: {
        tags: ['RBACRoles'],
        summary: 'Get RBAC role by id',
        responses: {
          '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/RbacRole' } } } },
          '404': { description: 'Not found' },
        },
      },
      put: {
        tags: ['RBACRoles'],
        summary: 'Update RBAC role',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RbacRole' } } },
        },
        responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } },
      },
      delete: {
        tags: ['RBACRoles'],
        summary: 'Delete RBAC role',
        responses: { '204': { description: 'Deleted' } },
      },
    },
    '/api/rbac/role-permissions': {
      get: {
        tags: ['RBACRolePermissions'],
        summary: 'List role permissions',
        responses: {
          '200': {
            description: 'An array of role permissions',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/RbacRolePermission' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['RBACRolePermissions'],
        summary: 'Create role permission',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RbacRolePermission' },
            },
          },
        },
        responses: { '201': { description: 'Role permission created' } },
      },
    },
    '/api/rbac/role-permissions/role/{rol_id}': {
      parameters: [{ name: 'rol_id', in: 'path', required: true, schema: { type: 'integer' } }],
      get: {
        tags: ['RBACRolePermissions'],
        summary: 'List role permissions by role',
        responses: {
          '200': {
            description: 'An array of role permissions',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/RbacRolePermission' } },
              },
            },
          },
        },
      },
    },
    '/api/rbac/role-permissions/permission/{per_id}': {
      parameters: [{ name: 'per_id', in: 'path', required: true, schema: { type: 'integer' } }],
      get: {
        tags: ['RBACRolePermissions'],
        summary: 'List role permissions by permission',
        responses: {
          '200': {
            description: 'An array of role permissions',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/RbacRolePermission' } },
              },
            },
          },
        },
      },
    },
    '/api/rbac/role-permissions/role/{rol_id}/permission/{per_id}': {
      parameters: [
        { name: 'rol_id', in: 'path', required: true, schema: { type: 'integer' } },
        { name: 'per_id', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      delete: {
        tags: ['RBACRolePermissions'],
        summary: 'Delete role permission',
        responses: { '204': { description: 'Deleted' } },
      },
    },
    '/api/rbac/user-roles': {
      get: {
        tags: ['RBACUserRoles'],
        summary: 'List user roles',
        responses: {
          '200': {
            description: 'An array of user roles',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/RbacUserRole' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['RBACUserRoles'],
        summary: 'Create user role',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RbacUserRole' },
            },
          },
        },
        responses: { '201': { description: 'User role created' } },
      },
    },
    '/api/rbac/user-roles/user/{usr_id}': {
      parameters: [{ name: 'usr_id', in: 'path', required: true, schema: { type: 'integer' } }],
      get: {
        tags: ['RBACUserRoles'],
        summary: 'List user roles by user',
        responses: {
          '200': {
            description: 'An array of user roles',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/RbacUserRole' } },
              },
            },
          },
        },
      },
    },
    '/api/rbac/user-roles/role/{rol_id}': {
      parameters: [{ name: 'rol_id', in: 'path', required: true, schema: { type: 'integer' } }],
      get: {
        tags: ['RBACUserRoles'],
        summary: 'List user roles by role',
        responses: {
          '200': {
            description: 'An array of user roles',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/RbacUserRole' } },
              },
            },
          },
        },
      },
    },
    '/api/rbac/user-roles/user/{usr_id}/role/{rol_id}': {
      parameters: [
        { name: 'usr_id', in: 'path', required: true, schema: { type: 'integer' } },
        { name: 'rol_id', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      delete: {
        tags: ['RBACUserRoles'],
        summary: 'Delete user role',
        responses: { '204': { description: 'Deleted' } },
      },
    },
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'List users',
        responses: {
          '200': {
            description: 'An array of users',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Create user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/User' },
            },
          },
        },
        responses: {
          '201': { description: 'User created' },
        },
      },
    },
    '/api/users/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      get: {
        tags: ['Users'],
        summary: 'Get user by id',
        responses: {
          '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          '404': { description: 'Not found' },
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Update user',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
        },
        responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete user',
        responses: { '204': { description: 'Deleted' } },
      },
    },
    '/api/team-members': {
      get: {
        tags: ['TeamMembers'],
        summary: 'List team members',
        responses: {
          '200': {
            description: 'An array of team members',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/TeamMember' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['TeamMembers'],
        summary: 'Create team member',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TeamMember' } } },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/team-members/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
      get: {
        tags: ['TeamMembers'],
        summary: 'Get team member by id',
        responses: {
          '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/TeamMember' } } } },
          '404': { description: 'Not found' },
        },
      },
      put: {
        tags: ['TeamMembers'],
        summary: 'Update team member',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TeamMember' } } },
        },
        responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } },
      },
      delete: {
        tags: ['TeamMembers'],
        summary: 'Delete team member',
        responses: { '204': { description: 'Deleted' } },
      },
    },
    '/api/team-members/country/{cou_id}': {
      parameters: [{ name: 'cou_id', in: 'path', required: true, schema: { type: 'integer' } }],
      get: {
        tags: ['TeamMembers'],
        summary: 'List team members for a country',
        responses: {
          '200': {
            description: 'An array of team members',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/TeamMember' } },
              },
            },
          },
          '400': { description: 'Invalid country id' },
        },
      },
    },
    '/api/team-members/supervisor/{supervisor_id}': {
      parameters: [{ name: 'supervisor_id', in: 'path', required: true, schema: { type: 'integer' } }],
      get: {
        tags: ['TeamMembers'],
        summary: 'List team members for a supervisor',
        responses: {
          '200': {
            description: 'An array of team members',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/TeamMember' } },
              },
            },
          },
          '400': { description: 'Invalid supervisor id' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      AuthUser: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          roles: { type: 'array', items: { type: 'string' } },
          avatarUrl: { type: 'string' },
          permissions: { $ref: '#/components/schemas/PermissionMap' },
        },
        required: ['id', 'email', 'roles'],
      },
      AuthExchangeResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          expiresIn: { type: 'integer' },
          user: { $ref: '#/components/schemas/AuthUser' },
        },
        required: ['accessToken', 'expiresIn', 'user'],
      },
      Country: {
        type: 'object',
        properties: {
          cou_id: { type: 'integer' },
          cou_name: { type: 'string' },
          reg_id: { type: 'integer' },
        },
        required: ['cou_name'],
      },
      TimeOffCategory: {
        type: 'object',
        properties: {
          cat_id: { type: 'integer' },
          cat_name: { type: 'string' }
        },
        required: ['cat_name']
      },
      Region: {
        type: 'object',
        properties: {
          reg_id: { type: 'integer' },
          reg_name: { type: 'string' }
        }
      },
      TimeOffCategoryXCountry: {
        type: 'object',
        properties: {
          cxc_id: { type: 'integer' },
          cat_id: { type: 'integer' },
          cou_id: { type: 'integer' },
          cxc_status: { type: 'integer' },
        },
        required: ['cat_id','cou_id']
      },
      TimeOff: {
        type: 'object',
        properties: {
          tto_id: { type: 'integer' },
          tms_id: { type: 'integer' },
          tto_stadat: { type: 'string', format: 'date' },
          tto_enddat: { type: 'string', format: 'date' },
          tto_created_by: { type: 'integer' },
          tto_credat: { type: 'string', format: 'date' },
          tto_last_updated_ny: { type: 'integer' },
          tto_last_upddat: { type: 'string', format: 'date' },
          cat_id: { type: 'integer' },
        },
        required: ['tto_stadat', 'tto_enddat']
      },
      TeamMemberProject: {
        type: 'object',
        properties: {
          txp_id: { type: 'integer' },
          tms_id: { type: 'integer' },
          pro_id: { type: 'integer' },
          txp_stadat: { type: 'string', format: 'date' },
          txp_enddat: { type: 'string', format: 'date' },
          rol_id: { type: 'integer' },
          txp_bill_rate: { type: 'string' },
          txp_br_curcod: { type: 'string' },
          txp_created_by: { type: 'integer' },
          txp_credat: { type: 'string', format: 'date' },
          txp_last_updated_by: { type: 'integer' },
          txp_last_upddat: { type: 'string', format: 'date' },
        },
        required: ['txp_stadat']
      },
      Project: {
        type: 'object',
        properties: {
          pro_id: { type: 'integer' },
          pro_name: { type: 'string' },
          pro_external_id: { type: 'string' },
          pro_sow: { type: 'string' },
        },
      },
      Role: {
        type: 'object',
        properties: {
          rol_id: { type: 'integer' },
          rol_name: { type: 'string' },
          rol_description: { type: 'string' },
        },
        required: ['rol_name'],
      },
      PermissionFlags: {
        type: 'object',
        properties: {
          read: { type: 'boolean' },
          create: { type: 'boolean' },
          delete: { type: 'boolean' },
        },
        required: ['read', 'create', 'delete'],
      },
      PermissionMap: {
        type: 'object',
        additionalProperties: { $ref: '#/components/schemas/PermissionFlags' },
      },
      RbacPermission: {
        type: 'object',
        properties: {
          per_id: { type: 'integer' },
          per_resource: { type: 'string' },
          per_read: { type: 'boolean' },
          per_write: { type: 'boolean' },
          per_delete: { type: 'boolean' },
          per_description: { type: 'string' },
          updated_at: { type: 'string', format: 'date-time' },
        },
        required: ['per_resource', 'per_read', 'per_write', 'per_delete'],
      },
      RbacRole: {
        type: 'object',
        properties: {
          rol_id: { type: 'integer' },
          rol_name: { type: 'string' },
          rol_description: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
        required: ['rol_name'],
      },
      RbacRolePermission: {
        type: 'object',
        properties: {
          rol_id: { type: 'integer' },
          per_id: { type: 'integer' },
        },
        required: ['rol_id', 'per_id'],
      },
      RbacUserRole: {
        type: 'object',
        properties: {
          usr_id: { type: 'integer' },
          rol_id: { type: 'integer' },
        },
        required: ['usr_id', 'rol_id'],
      },
      User: {
        type: 'object',
        properties: {
          usr_id: { type: 'integer' },
          usr_name: { type: 'string' },
          usr_email: { type: 'string' },
          usr_role: { type: 'string' },
          usr_stadat: { type: 'string', format: 'date' },
          usr_enddat: { type: 'string', format: 'date' },
        },
        required: ['usr_name', 'usr_email', 'usr_role', 'usr_stadat'],
      },
      TeamMember: {
        type: 'object',
        properties: {
          tms_id: { type: 'integer' },
          tms_primary_role: { type: 'integer', nullable: true },
          tms_created_by: { type: 'integer', nullable: true },
          tms_credat: { type: 'string', format: 'date', nullable: true },
          tms_last_updated_by: { type: 'integer', nullable: true },
          tms_last_upddat: { type: 'string', format: 'date', nullable: true },
          tms_stadat: { type: 'string', format: 'date' },
          tms_enddat: { type: 'string', format: 'date', nullable: true },
          cou_id: { type: 'integer', nullable: true },
          tms_supervisor_id: { type: 'integer', nullable: true },
          tms_names: { type: 'string' },
          tms_surnames: { type: 'string' },
          tms_known_as: { type: 'string', nullable: true },
          tms_seniority: { type: 'string' },
          wdid: { type: 'string', nullable: true },
        },
        required: ['tms_names', 'tms_surnames', 'tms_seniority', 'tms_stadat'],
      },
    },
  },
};
