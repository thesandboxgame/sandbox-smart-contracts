/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import readline from 'readline';
import {google} from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'token.json';
function getNewToken(oAuth2Client: any, callback: (client: any) => void) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code: string) => {
    rl.close();
    oAuth2Client.getToken(code, (err: any, token: string) => {
      if (err) {
        return console.error(
          'Error while trying to retrieve access token',
          err
        );
      }
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err: any) => {
        if (err) {
          console.error(err);
        }
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}
function authorize(
  credentials: {
    installed: {client_secret: string; client_id: string; redirect_uris: any};
  },
  callback: (client: any) => void
) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );
  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err: Error | null, token: Buffer) => {
    if (err) {
      return getNewToken(oAuth2Client, callback);
    }
    oAuth2Client.setCredentials(JSON.parse(token.toString()));
    callback(oAuth2Client);
  });
}

function withAuthorization(call: any) {
  fs.readFile(
    './.google_credentials.json',
    (err: Error | null, content: Buffer) => {
      if (err) {
        return console.log('Error loading client secret file:', err);
      }
      // Authorize a client with credentials, then call the Google Sheets API.
      authorize(JSON.parse(content.toString()), call);
    }
  );
}

export function write(
  {document, sheet}: {document: string; sheet: string},
  {values, range}: {values: string[][]; range: string}
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const rangeId = sheet + '!' + range;
    withAuthorization((auth: any) => {
      const sheets = google.sheets({version: 'v4', auth});
      sheets.spreadsheets.values.clear(
        {
          spreadsheetId: document,
          range: rangeId,
        },
        (err: any) => {
          if (err) {
            reject(err);
          }
          (sheets.spreadsheets.values as any).update(
            {
              spreadsheetId: document,
              range: rangeId,
              valueInputOption: 'USER_ENTERED',
              resource: {
                values,
              },
            },
            (err: any) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            }
          );
        }
      );
    });
  });
}

// function uploadGasReport(sheetId: string, {gasReport, range}) {
//   const values = [];
//   for (const test of Object.keys(gasReport)) {
//     values.push(['test: ' + test]);
//     for (const contractName of Object.keys(gasReport[test])) {
//       const data = gasReport[test][contractName];
//       if (data.gasUsed) {
//         values.push(['- ' + contractName, data.average]);
//       } else {
//         values.push(['- ' + contractName]);
//         for (const option of Object.keys(data)) {
//           const optionData = data[option];
//           values.push(['   ' + option, optionData.average]);
//         }
//       }
//     }
//   }
//   return write(sheetId, {values, range});
// }

export function read(
  {document, sheet}: {document: string; sheet: string},
  range: string
): Promise<any> {
  return new Promise((resolve) => {
    withAuthorization(async (auth: any) => {
      const sheets = google.sheets({version: 'v4', auth});
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: document,
        range: sheet + '!' + (range || 'A1:ZZ1000'),
        // range: 'result!A5:B',
        // valueInputOption: 'USER_ENTERED',
        // resource: {
        //     values
        // }
      });
      resolve(res.data.values);
    });
  });
}
