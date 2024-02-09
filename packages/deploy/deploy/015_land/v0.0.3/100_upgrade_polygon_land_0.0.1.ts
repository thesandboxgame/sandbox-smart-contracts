/*
  The original Land contract was deployed from the `core` package.
  We upgrade the Land contract from the new `land` package
 */
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, catchUnknownSigner} = deployments;

  const {deployer, upgradeAdmin} = await getNamedAccounts();
  await catchUnknownSigner(
    deploy('PolygonLand', {
      from: deployer,
      log: true,
      contract:
        '@sandbox-smart-contracts/land/contracts/PolygonLandV2.sol:PolygonLandV2',
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OpenZeppelinTransparentProxy',
        upgradeIndex: 1,
      },
    })
  );
};
export default func;
func.tags = ['PolygonLand', 'PolygonLand_upgrade_0.0.1_to_0.0.3', 'L2'];
func.dependencies = ['PolygonLand_deploy_0.0.1'];
