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
}

module.exports = new Configs();
