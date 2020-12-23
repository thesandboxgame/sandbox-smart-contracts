import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {execute, read, log} = deployments;

  // Set Multi_Giveaway_1_with_ERC20 contract as superOperator for Asset
  // This is needed when the contract is not the assetsHolder
  const giveawayContract = await deployments.get('Multi_Giveaway_1_with_ERC20');

  const isAssetSuperOperator = await read(
    'Land',
    'isSuperOperator',
    giveawayContract.address
  );

  if (!isAssetSuperOperator) {
    log('setting Giveaway contract as Super Operator for LAND');
    const currentAssetAdmin = await read('Asset', 'getAdmin');
    await execute(
      'Asset',
      {from: currentAssetAdmin, log: true},
      'setSuperOperator',
      giveawayContract.address,
      true
    );
  }

  // TODO: check if needed
  // Set giveaway contract as superOperator for Land

  const isLandSuperOperator = await read(
    'Land',
    'isSuperOperator',
    giveawayContract.address
  );

  if (!isLandSuperOperator) {
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

  // TODO: check if needed
  // Set giveaway contract as superOperator for Sand

  const isSandSuperOperator = await read(
    'Sand',
    'isSuperOperator',
    giveawayContract.address
  );

  if (!isSandSuperOperator) {
    log('setting Giveaway contract as Super Operator for SAND');
    const currentAssetAdmin = await read('Sand', 'getAdmin');
    await execute(
      'Sand',
      {from: currentAssetAdmin, log: true},
      'setSuperOperator',
      giveawayContract.address,
      true
    );
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = ['Multi_Giveaway_1', 'Multi_Giveaway_1_setup'];
func.dependencies = ['Multi_Giveaway_1_deploy'];
func.skip = async (hre) => hre.network.name !== 'hardhat'; // TODO
