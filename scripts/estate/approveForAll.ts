import {ethers} from 'hardhat';

async function main() {
  const nodeUrl = process.env.ETH_NODE_URI_POLYGON;
  if (!nodeUrl) {
    throw new Error(`Set the env var ETH_NODE_URI_POLYGON`);
  }
  const pk = process.env.USER_PK;
  if (!pk) {
    throw new Error(`Set the env var USER_PK`);
  }
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.ETH_NODE_URI_POLYGON
  );
  const wallet = new ethers.Wallet(pk, provider);

  const estateContact = await ethers.getContract('PolygonEstate', wallet);
  const landContact = await ethers.getContract('PolygonLand', wallet);
  console.log(
    'Calling landContract (',
    landContact.address,
    ') setApprovalForAll',
    estateContact.address
  );
  const tx = await landContact.setApprovalForAll(estateContact.address, true);
  const receipt = await tx.wait();
  console.log('setApprovalForAll receipt', receipt);
}

if (require.main === module) {
  main().catch((err) => console.error(err.message));
}
