import 'dotenv/config';
import {create, globSource} from 'ipfs-http-client';

const projectId = process.env.IPFS_PROJECT_ID;
const projectSecret = process.env.IPFS_PROJECT_SECRET;

const auth =
  'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

const ipfs = create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: auth,
  },
});

void (async () => {
  // Script to upload files to IPFS for dummy metadata

  for await (const file of ipfs.addAll(globSource('./metadata', '**/*'))) {
    console.log(file, file.cid.toString());
  }
  // Get CIDs from console
})();
