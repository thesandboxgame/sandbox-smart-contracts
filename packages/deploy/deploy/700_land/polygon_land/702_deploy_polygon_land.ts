import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute} = deployments;
  const {deployer, landAdmin, upgradeAdmin} = await getNamedAccounts();
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');

  await deploy('PolygonLand', {
    from: deployer,
    contract: 'PolygonLandV1',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [TRUSTED_FORWARDER.address],
      },
      upgradeIndex: 0,
    },
    log: true,
  });

  await execute(
    'PolygonLand',
    {from: deployer, log: true},
    'changeAdmin',
    landAdmin
  );
};
export default func;
func.tags = ['PolygonLand', 'PolygonLand_deploy', 'L2'];
func.dependencies = ['TRUSTED_FORWARDER_V2'];
