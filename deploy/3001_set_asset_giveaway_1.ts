import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {AssetClaim} from '../data/asset_giveaway_1/getAssets';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
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
  }

  if (!smurfOwner || smurfOwner === '') {
    return;
  }

  const AssetGiveaway = await deployments.get('Asset_Giveaway_1');

  const assetData: AssetClaim[] = AssetGiveaway.linkedData;

  await execute(
    'Asset',
    {from: smurfOwner},
    'safeTransferFrom',
    smurfOwner,
    smurfId,
    assetData.length,
    '0x'
  );
};
export default func;
func.runAtTheEnd = true;
func.tags = ['Asset_Giveaway_1', 'Asset_Giveaway_1_setup'];
func.dependencies = ['Asset_Giveaway_1_deploy'];
