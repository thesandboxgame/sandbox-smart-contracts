import hre from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';
import {AssetClaim} from '../lib/merkleTreeHelper';

const func: DeployFunction = async function () {
  const {deployments, ethers, getNamedAccounts} = hre;

  const {deployer} = await getNamedAccounts();
  const DeployerBatch = await ethers.getContract('DeployerBatch', deployer);
  const Asset = await ethers.getContract('Asset');
  const AssetGiveaway = await deployments.get('Asset_Giveaway_1');
  const smurfId =
    '55464657044963196816950587289035428064568320970692304673817341489687505668096';
  const assetData: AssetClaim[] = AssetGiveaway.linkedData;

  const {data} = await Asset.populateTransaction[
    'safeTransferFrom(address,address,uint256,uint256,bytes)'
  ](
    DeployerBatch.address,
    AssetGiveaway.address,
    smurfId,
    assetData.length,
    '0x'
  );

  const tx = await DeployerBatch.singleTargetAtomicBatch(
    Asset.address,
    [data],
    {gasPrice: '56000000000'}
  ); // TODO allow gasprice to be passed as parameter to the script
  console.log({txHash: tx.hash});
  await tx.wait();
};
export default func;

if (require.main === module) {
  func(hre).catch((err) => console.error(err));
}
