import {ethers} from 'hardhat';

async function main() {
  const nodeUrl = process.env.ETH_NODE_URI_POLYGON;
  if (!nodeUrl) {
    throw new Error(`Set the env var ETH_NODE_URI_POLYGON`);
  }
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.ETH_NODE_URI_POLYGON
  );
  // sandadmin
  const sandAdmin = '0x7A9fe22691c811ea339D9B73150e6911a5343DcA';
  const signer = provider.getSigner(sandAdmin);
  const estateContract = await ethers.getContract('PolygonEstate', signer);

  // grant admin to DEFAULT_ADMIN_ROLE
  const ADMIN_ROLE = await estateContract.ADMIN_ROLE();
  if (!(await estateContract.hasRole(ADMIN_ROLE, sandAdmin))) {
    await estateContract.grantRole(ADMIN_ROLE, sandAdmin);
  }
  console.log('pre', await estateContract.contractURI());
  const args = process.argv.slice(process.argv.indexOf(__filename) + 1);
  await estateContract.setBaseURI(args[0]);
  console.log('pos', await estateContract.contractURI());
}

if (require.main === module) {
  main().catch((err) => console.error(err.message));
}
