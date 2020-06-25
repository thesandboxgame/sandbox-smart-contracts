const {read} = require("./spreadsheet");

async function parseSheet({document, sheet}, {startRow, endRow, fields, filter, recordRowNumber}) {
  const values = (await read({document, sheet})).slice(startRow - 1, endRow);
  const data = [];
  let rowNumber = startRow;
  for (const row of values) {
    const object = {};
    const numCols = row.length;
    if (numCols === 0) {
      rowNumber++;
      continue;
    }
    for (let col = 0; col < numCols; col++) {
      const value = row[col];
      const fieldSpec = fields[col + 1];
      if (fieldSpec) {
        if (typeof fieldSpec === "string") {
          object[fieldSpec] = value;
        } else if (fieldSpec.parse) {
          object[fieldSpec.name] = fieldSpec.parse(value);
        } else {
          object[fieldSpec.name] = value;
        }
      }
    }
    if (recordRowNumber) {
      object.rowNumber = rowNumber;
    }
    data.push(object);
    rowNumber++;
  }
  return filter ? data.filter(filter) : data;
}

module.exports = parseSheet;
