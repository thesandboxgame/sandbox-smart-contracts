import hre from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';
import {AssetClaim} from '../lib/merkleTreeHelper';

const func: DeployFunction = async function () {
  const {deployments} = hre;
  const {execute, catchUnknownSigner} = deployments;

  let owner;
  let tokenId;

  switch (hre.network.name) {
    case 'mainnet':
      owner = '0x7a9fe22691c811ea339d9b73150e6911a5343dca';
      tokenId =
        '55464657044963196816950587289035428064568320970692304673817341489687522457600';
      break;
    case 'rinkeby':
      owner = '0x60927eB036621b801491B6c5e9A60A8d2dEeD75A';
      tokenId =
        '43680867506168749228565131403402869733336284654176091019334004301894460114944';
      break;
  }

  if (!owner || owner === '') {
    return;
  }

  const AssetGiveaway = await deployments.get('Asset_Giveaway_2');

  const assetData: AssetClaim[] = AssetGiveaway.linkedData;

  await catchUnknownSigner(
    execute(
      'Asset',
      {from: owner, log: true},
      'safeTransferFrom(address,address,uint256,uint256,bytes)',
      owner,
      AssetGiveaway.address,
      tokenId,
      assetData.length,
      '0x'
    )
  );
};
export default func;

if (require.main === module) {
  func(hre);
}
