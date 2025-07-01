const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const YAML = require('yamljs');

class Configs {
    utcDefault() {
        let date = new Date();
        return moment.utc(date).format();
    }
    setupSwagger() {
        const swaggerDocument = YAML.load(path.resolve(__dirname, '../swagger/pmsswagger.yaml'));
        swaggerDocument.paths = {...swaggerDocument.paths};

        const options = {
            swaggerDefinition: swaggerDocument,
            apis: ['./routes/v1/*.js'], // Adjust the path as necessary
        };
        const swaggerSpec = swaggerJsdoc(options);
        return swaggerSpec;
    }

    /**
   * Validate data against a schema and format error messages
   * @param {Object} schema - Joi schema
   * @param {Object} data - Data to validate
   * @returns {Object} { error, value }
   */
  validateFormatter(schema, data) {
    const options = {
      abortEarly: false, // Return all errors, not just the first
      allowUnknown: true // Allow unknown fields in the request
    };

    const { error, value } = schema.validate(data, options);
    if (error) {
      // Remove double quotes from error messages and convert to uppercase
      error.details.forEach((detail) => {
        detail.message = detail.message.replace(/\"/g, ""); // Format message
      });
    }
    return { error, value };
  }

}

module.exports = new Configs();
