const fs = require("fs");
const readline = require("readline");
const {google} = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const TOKEN_PATH = "token.json";
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter the code from that page here: ", (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) {
        return console.error("Error while trying to retrieve access token", err);
      }
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) {
          console.error(err);
        }
        console.log("Token stored to", TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) {
      return getNewToken(oAuth2Client, callback);
    }
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

function withAuthorization(call) {
  fs.readFile("./.google_credentials.json", (err, content) => {
    if (err) {
      return console.log("Error loading client secret file:", err);
    }
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), call);
  });
}

function uploadGasReport(sheetId, gasReport) {
  const values = [];
  for (const test of Object.keys(gasReport)) {
    values.push(["test: " + test]);
    for (const contractName of Object.keys(gasReport[test])) {
      const data = gasReport[test][contractName];
      if (data.gasUsed) {
        values.push(["- " + contractName, data.average]);
      } else {
        values.push(["- " + contractName]);
        for (const option of Object.keys(data)) {
          const optionData = data[option];
          values.push(["   " + option, optionData.average]);
        }
      }
    }
  }
  withAuthorization((auth) => {
    const sheets = google.sheets({version: "v4", auth});
    sheets.spreadsheets.values.clear(
      {
        spreadsheetId: sheetId,
        range: "result!A5:B",
      },
      (err) => {
        if (err) {
          return console.error("GOOGLE SPREADSHEET CLEAR: " + err);
        }
        sheets.spreadsheets.values.update(
          {
            spreadsheetId: sheetId,
            range: "result!A5:B",
            valueInputOption: "USER_ENTERED",
            resource: {
              values,
            },
          },
          (err) => {
            if (err) {
              return console.error("GOOGLE SPREADSHEET UPDATE: " + err);
            }
          }
        );
      }
    );
  });
}

function read(spreadsheetId, sheetName, range) {
  return new Promise((resolve) => {
    withAuthorization(async (auth) => {
      const sheets = google.sheets({version: "v4", auth});
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: sheetName + "!" + (range || "A1:ZZ1000"),
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

module.exports = {
  uploadGasReport,
  read,
};
