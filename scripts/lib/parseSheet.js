const {read} = require('../../lib/spreadsheet');

async function parseSheet(doc, sheet, {startRow, lastRow, fields, filter}) {
    const values = (await read(doc, sheet)).slice(startRow - 1, lastRow);
    const data = [];
    for (const row of values) {
        const object = {};
        const numCols = row.length;
        if (numCols === 0) {
            continue;
        }
        for (let col = 0; col < numCols; col++) {
            const value = row[col];
            const fieldSpec = fields[col + 1];
            if (fieldSpec) {
                if (typeof fieldSpec === 'string') {
                    object[fieldSpec] = value;
                } else if (fieldSpec.parse) {
                    object[fieldSpec.name] = fieldSpec.parse(value);
                } else {
                    object[fieldSpec.name] = value;
                }
            }
        }
        data.push(object);
    }
    return filter ? data.filter(filter) : data;
}

module.exports = parseSheet;