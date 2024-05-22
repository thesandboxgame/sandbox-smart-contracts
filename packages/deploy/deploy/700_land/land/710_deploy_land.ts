import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {ZeroAddress} from 'ethers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, catchUnknownSigner} = deployments;
  const {deployer, sandAdmin, upgradeAdmin} = await getNamedAccounts();
  await catchUnknownSigner(
    deploy('Land', {
      from: deployer,
      contract: '@sandbox-smart-contracts/core/src/solc_0.5/Land.sol:Land',
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OpenZeppelinTransparentProxy',
        execute: {
          methodName: 'initialize',
          args: [ZeroAddress, sandAdmin], // used ZeroAddress as MetaTx address
        },
        upgradeIndex: 0,
      },
      log: true,
    })
  );
};
export default func;
func.tags = ['Land', 'LandV1', 'Land_deploy', 'L1'];
