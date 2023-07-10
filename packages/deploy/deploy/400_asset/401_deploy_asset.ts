import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, assetAdmin, upgradeAdmin} = await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');

  await deploy('Asset', {
    from: deployer,
    contract: '@sandbox-smart-contracts/asset/contracts/Asset.sol:Asset',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          TRUSTED_FORWARDER.address,
          assetAdmin,
          [1, 2, 3, 4, 5, 6], // catalystTiers
          [2, 4, 6, 8, 10, 12], // catalystRecycleCopiesNeeded
          'ipfs://',
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};
export default func;

func.tags = ['Asset', 'Asset_deploy'];
func.dependencies = ['TRUSTED_FORWARDER_V2'];
