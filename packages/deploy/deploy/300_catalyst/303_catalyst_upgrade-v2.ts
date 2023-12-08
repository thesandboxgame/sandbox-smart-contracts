import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {execute, read, catchUnknownSigner, deploy} = deployments;
  const {deployer, upgradeAdmin, catalystAdmin} = await getNamedAccounts();

  await deploy('Catalyst', {
    from: deployer,
    log: true,
    contract: '@sandbox-smart-contracts/asset/contracts/Catalyst.sol:Catalyst',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      upgradeIndex: 1,
    },
  });

  if ((await read('Catalyst', 'owner')) === ethers.constants.AddressZero) {
    await catchUnknownSigner(
      execute(
        'Catalyst',
        {from: catalystAdmin, log: true},
        'transferOwnership',
        catalystAdmin
      )
    );
  }
};
export default func;
func.tags = ['Catalyst_upgrade'];
func.dependencies = ['Catalyst_deploy', 'Catalyst_setup'];
