/*
  The original Land contract was deployed from the `core` package.
  We upgrade the Land contract from the new land package
 */
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {isL1} from '../../utils/deploymentSkip';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, catchUnknownSigner} = deployments;

  const {deployer, upgradeAdmin} = await getNamedAccounts();
  await catchUnknownSigner(
    deploy(isL1(hre) ? 'Land' : 'PolygonLand', {
      from: deployer,
      log: true,
      contract: isL1(hre)
        ? '@sandbox-smart-contracts/land/contracts/LandV3.sol:LandV3'
        : '@sandbox-smart-contracts/land/contracts/PolygonLandV2.sol:PolygonLandV2',
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OpenZeppelinTransparentProxy',
        upgradeIndex: 1,
      },
    })
  );
};
export default func;
func.tags = ['Land', 'Land_upgrade_1'];
func.dependencies = ['Land_deploy'];
