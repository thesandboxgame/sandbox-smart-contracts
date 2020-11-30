import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, log} = deployments;

  const {nftGiveawayAdmin} = await getNamedAccounts();

  let currentAdmin;
  try {
    currentAdmin = await read('NFT_Lottery_1', 'getAdmin');
  } catch (e) {
    // no admin
  }
  if (currentAdmin) {
    if (currentAdmin.toLowerCase() !== nftGiveawayAdmin.toLowerCase()) {
      await execute(
        'NFT_Lottery_1',
        {from: currentAdmin, log: true},
        'changeAdmin',
        nftGiveawayAdmin
      );
    }
  }

  // Set NFT_Lottery_1 contract as superOperator for Asset
  // This is needed when NFT_Lottery_1 is not the assetsHolder
  const giveawayContract = await deployments.get('NFT_Lottery_1');

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
func.tags = ['NFT_Lottery_1', 'NFT_Lottery_1_setup'];
func.dependencies = ['NFT_Lottery_1_deploy'];
