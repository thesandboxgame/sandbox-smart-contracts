import path from 'path';
import fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetch = require('node-fetch');

export async function fetchData(): Promise<{x: number; y: number}[]> {
  let data;
  if (data) {
    return data;
  }
  const fileName = path.join(__dirname, '..', '..', 'data', 'premium.json');
  if (!fs.existsSync(fileName)) {
    const response = await fetch('https://api.sandbox.game/lands/premium');
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    data = ((await response.json()) as {
      coordinateX: number;
      coordinateY: number;
    }[]).map(({coordinateX: x, coordinateY: y}) => ({x, y}));
    console.log('Writing to', fileName);
    fs.writeFileSync(fileName, JSON.stringify(data));
  } else {
    console.log('Reading from', fileName);
    data = JSON.parse(fs.readFileSync(fileName).toString());
  }
  return data;
}
