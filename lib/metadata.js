const Ajv = require('ajv');
const schema = require('./assetMetadataSchema.json')
const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
const validate = ajv.compile(schema);

module.exports = {
    validate
};
