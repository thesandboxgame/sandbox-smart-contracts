import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, log} = deployments;

  const {nftGiveawayAdmin} = await getNamedAccounts();

  let currentAdmin;
  try {
    currentAdmin = await read('Asset_Giveaway_1', 'getAdmin');
  } catch (e) {
    // no admin
  }
  if (currentAdmin) {
    if (currentAdmin.toLowerCase() !== nftGiveawayAdmin.toLowerCase()) {
      await execute(
        'Asset_Giveaway_1',
        {from: currentAdmin, log: true},
        'changeAdmin',
        nftGiveawayAdmin
      );
    }
  }

  // Set Asset_Giveaway_1 contract as superOperator for Asset
  // This is needed when Asset_Giveaway_1 is not the assetsHolder
  const giveawayContract = await deployments.get('Asset_Giveaway_1');

  const isAssetSuperOperator = await read(
    'Asset',
    'isSuperOperator',
    giveawayContract.address
  );

  if (!isAssetSuperOperator) {
    log('setting Giveaway contract as Super Operator for ASSET');
    const currentAssetAdmin = await read('Asset', 'getAdmin');
    await execute(
      'Asset',
      {from: currentAssetAdmin, log: true},
      'setSuperOperator',
      giveawayContract.address,
      true
    );
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = ['Asset_Giveaway_1', 'Asset_Giveaway_1_setup'];
func.dependencies = ['Asset_Giveaway_1_deploy'];
