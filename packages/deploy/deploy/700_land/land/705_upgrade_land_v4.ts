import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute} = deployments;

  const {deployer, upgradeAdmin} = await getNamedAccounts();
  await deploy('Land', {
    from: deployer,
    contract: '@sandbox-smart-contracts/land/contracts/Land.sol:Land',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      upgradeIndex: 3,
    },
    log: true,
  });

  const RoyaltyManager = await deployments.get('RoyaltyManager');
  await execute(
    'Land',
    {from: deployer, log: true},
    'setRoyaltyManager',
    RoyaltyManager.address
  );
};

export default func;
func.tags = ['Land', 'LandV4', 'LandV4_deploy'];
func.dependencies = ['RoyaltyManager_deploy'];
