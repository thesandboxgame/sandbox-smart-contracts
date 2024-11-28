import 'isomorphic-unfetch';
import {Client, createClient} from '@urql/core';

export class TheGraph {
  private client: Client;

  constructor(url: string) {
    this.client = createClient({
      url,
    });
  }

  async query<T>(
    queryString: string,
    field: string,
    variables: Record<string, unknown>,
    getLastId?: (entries: T[]) => string
  ): Promise<T[]> {
    const fields = field.split('.');
    const first = 100;
    let lastId = '0x0';
    let numEntries = first;
    let entries: T[] = [];
    while (numEntries === first) {
      const result = await this.client
        .query(queryString, {first, lastId, ...variables})
        .toPromise();
      if (result.error) {
        throw new Error(result.error.message);
      }
      const data = result.data;

      // TODO deep access on root array
      let newEntries = [];
      if (data && field) {
        let tmp = data;
        for (const fieldPart of fields) {
          tmp = tmp[fieldPart];
        }
        newEntries = tmp;
      }

      numEntries = newEntries.length;
      if (numEntries > 0) {
        const newLastId =
          getLastId !== undefined
            ? getLastId(entries)
            : newEntries[numEntries - 1].id;
        if (lastId === newLastId) {
          console.log('same query, stop');
          break;
        }
        lastId = newLastId;
      }
      entries = entries.concat(newEntries);
    }
    return entries;
  }
}
