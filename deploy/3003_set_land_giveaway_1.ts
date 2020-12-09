import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, log} = deployments;

  const {nftGiveawayAdmin} = await getNamedAccounts();

  let currentAdmin;
  try {
    currentAdmin = await read('Land_Giveaway_1', 'getAdmin');
  } catch (e) {
    // no admin
  }
  if (currentAdmin) {
    if (currentAdmin.toLowerCase() !== nftGiveawayAdmin.toLowerCase()) {
      await execute(
        'Land_Giveaway_1',
        {from: currentAdmin, log: true},
        'changeAdmin',
        nftGiveawayAdmin
      );
    }
  }

  // TODO: check if needed
  // Set Land_Giveaway_1 contract as superOperator for Land
  // This is needed when Land_Giveaway_1 is not the landHolder
  const giveawayContract = await deployments.get('Land_Giveaway_1');

  const isAssetSuperOperator = await read(
    'Land',
    'isSuperOperator',
    giveawayContract.address
  );

  if (!isAssetSuperOperator) {
    log('setting Giveaway contract as Super Operator for LAND');
    const currentAssetAdmin = await read('Land', 'getAdmin');
    await execute(
      'Land',
      {from: currentAssetAdmin, log: true},
      'setSuperOperator',
      giveawayContract.address,
      true
    );
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = ['Land_Giveaway_1', 'Land_Giveaway_1_setup'];
func.dependencies = ['Land_Giveaway_1_deploy'];
