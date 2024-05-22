import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, catchUnknownSigner} = deployments;
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  await catchUnknownSigner(
    deploy('Land', {
      from: deployer,
      contract: '@sandbox-smart-contracts/core/src/solc_0.5/LandV3.sol:LandV3',
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OpenZeppelinTransparentProxy',
        upgradeIndex: 2,
      },
      log: true,
    })
  );
};

export default func;
func.tags = ['Land', 'LandV3', 'LandV3_deploy', 'L1'];
func.dependencies = ['LandV2_deploy'];
