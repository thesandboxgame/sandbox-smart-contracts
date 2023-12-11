import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {read, catchUnknownSigner, execute, deploy} = deployments;
  const {deployer, upgradeAdmin, assetAdmin} = await getNamedAccounts();

  await deploy('Asset', {
    from: deployer,
    contract: '@sandbox-smart-contracts/asset/contracts/Asset.sol:Asset',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      upgradeIndex: 1,
    },
    log: true,
  });

  if ((await read('Asset', 'owner')) === ethers.constants.AddressZero) {
    await catchUnknownSigner(
      execute(
        'Asset',
        {from: assetAdmin, log: true},
        'transferOwnership',
        assetAdmin
      )
    );
  }
};
export default func;

func.tags = ['Asset_upgrade'];
func.dependencies = ['Asset_deploy', 'Asset_setup'];
