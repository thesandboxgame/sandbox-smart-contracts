import hre from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';
import {AssetClaim} from '../data/asset_giveaway_1/getAssets';

const func: DeployFunction = async function () {
  const {deployments} = hre;
  const {execute} = deployments;

  let smurfOwner;
  let smurfId;

  switch (hre.network.name) {
    case 'mainnet':
      smurfOwner = '0x7a9fe22691c811ea339d9b73150e6911a5343dca';
      smurfId =
        '55464657044963196816950587289035428064568320970692304673817341489687505668096';
      break;
    case 'rinkeby':
      smurfOwner = '0x60927eB036621b801491B6c5e9A60A8d2dEeD75A';
      smurfId =
        '43680867506168749228565131403402869733336284654176091019334004301894460114944';
      break;
  }

  if (!smurfOwner || smurfOwner === '') {
    return;
  }

  const AssetGiveaway = await deployments.get('Asset_Giveaway_1');

  const assetData: AssetClaim[] = AssetGiveaway.linkedData;

  await execute(
    'Asset',
    {from: smurfOwner, log: true},
    'safeTransferFrom(address,address,uint256,uint256,bytes)',
    smurfOwner,
    AssetGiveaway.address,
    smurfId,
    assetData.length,
    '0x'
  );
};
export default func;

if (require.main === module) {
  func(hre);
}
