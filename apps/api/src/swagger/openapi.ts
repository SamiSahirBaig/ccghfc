export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'CityClean Civic Issue Reporting & IoT Redressal API',
    version: '1.0.0',
    description:
      'Complete production REST API for municipal grievance redressal, AI photo validation, 72-hour automated SLA escalation, and MQ135 IoT sensor ingestion.',
    contact: {
      name: 'CityClean Municipal Operations',
      email: 'support@cityclean.gov',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Endpoint',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      DeviceAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Api-Key',
      },
      DeviceId: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Device-Id',
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register citizen account',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Priya Sharma' },
                  email: { type: 'string', example: 'priya@example.com' },
                  password: { type: 'string', example: 'password123' },
                  phone: { type: 'string', example: '+919876543210' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Citizen created and tokens generated' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login with credentials',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'citizen@cityclean.gov' },
                  password: { type: 'string', example: 'password123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Access token and user profile returned' },
        },
      },
    },
    '/complaints': {
      post: {
        summary: 'Submit civic defect report with photos and GPS',
        tags: ['Complaints'],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['title', 'description', 'categoryId', 'latitude', 'longitude', 'address'],
                properties: {
                  title: { type: 'string', example: 'Severe Garbage Overflow at Market Corner' },
                  description: { type: 'string', example: 'Dumping site overflowing onto main pedestrian road.' },
                  categoryId: { type: 'string' },
                  latitude: { type: 'number', example: 28.6139 },
                  longitude: { type: 'number', example: 77.2090 },
                  address: { type: 'string', example: 'Connaught Place Block B' },
                  photos: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Complaint created, AI verified, and SLA started' },
        },
      },
      get: {
        summary: 'List complaints with filters',
        tags: ['Complaints'],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'wardId', in: 'query', schema: { type: 'string' } },
          { name: 'priority', in: 'query', schema: { type: 'string' } },
          { name: 'mine', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: {
          200: { description: 'List of complaints with pagination' },
        },
      },
    },
    '/device/readings': {
      post: {
        summary: 'Ingest IoT node telemetry (MQ135 PPM)',
        tags: ['IoT Hardware'],
        security: [{ DeviceAuth: [], DeviceId: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['deviceId', 'readings'],
                properties: {
                  deviceId: { type: 'string', example: 'NODE-001' },
                  ts: { type: 'integer', example: 1760380000 },
                  readings: {
                    type: 'object',
                    properties: {
                      mq135_raw: { type: 'number', example: 612 },
                      mq135_ppm: { type: 'number', example: 187.4 },
                      temperature_c: { type: 'number', example: 31.2 },
                      humidity: { type: 'number', example: 64 },
                    },
                  },
                  battery_v: { type: 'number', example: 3.9 },
                  fw: { type: 'string', example: '1.0.0' },
                },
              },
            },
          },
        },
        responses: {
          202: { description: 'Reading accepted; returns alert status and next interval' },
        },
      },
    },
    '/public/stats': {
      get: {
        summary: 'Get public transparency stats and resolution leaderboard',
        tags: ['Public'],
        responses: {
          200: { description: 'Cached global resolution and SLA metrics' },
        },
      },
    },
    '/public/map': {
      get: {
        summary: 'Get public anonymized civic issues map data',
        tags: ['Public'],
        responses: {
          200: { description: 'Complaints coordinates and priority badges' },
        },
      },
    },
  },
};
