import fs from 'fs';
import hre from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function () {
  const {ethers, getNamedAccounts} = hre;

  const owners = JSON.parse(
    fs.readFileSync('tmp/asset_owners.json').toString()
  );

  const {deployer} = await getNamedAccounts();
  const DeployerBatch = await ethers.getContract('DeployerBatch', deployer);
  const Asset = await ethers.getContract('Asset');

  const assetIds: string[] = [];
  const values: string[] = [];
  for (const owner of owners) {
    if (owner.id === '0xafd9193bb7a7c1bb103308bcbdb81315b55d9d54') {
      for (const assetToken of owner.assetTokens) {
        assetIds.push(assetToken.token.id);
        values.push(assetToken.quantity);
      }
    }
  }

  const {data} = await Asset.populateTransaction[
    'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)'
  ](
    DeployerBatch.address,
    '0xafd9193bb7a7c1bb103308bcbdb81315b55d9d54',
    assetIds,
    values,
    '0x'
  );

  const tx = await DeployerBatch.singleTargetAtomicBatch(
    Asset.address,
    [data],
    {gasLimit: 10000000}
  );
  console.log({txHash: tx.hash});
  await tx.wait();
};
export default func;

if (require.main === module) {
  func(hre).catch((err) => console.error(err));
}
