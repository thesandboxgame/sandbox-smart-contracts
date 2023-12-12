import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, upgradeAdmin} = await getNamedAccounts();

  const TRUSTED_FORWARDER_V2 = await deployments.get('TRUSTED_FORWARDER_V2');

  await deploy('PolygonLand', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/core/src/solc_0.8/polygon/child/land/PolygonLandV2.sol:PolygonLandV2',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [TRUSTED_FORWARDER_V2.address],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};
export default func;
func.tags = ['PolygonLand', 'PolygonLand_deploy', 'L2'];
func.dependencies = ['TRUSTED_FORWARDER_V2'];
