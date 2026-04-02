const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Finance Dashboard API',
      version: '1.0.0',
      description:
        'REST API for a Finance Dashboard with role-based access control. ' +
        'Roles: viewer (read-only), analyst (read + insights), admin (full access).',
      contact: {
        name: 'Finance Backend',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste your JWT token here (without "Bearer " prefix)',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./*.js'],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
