import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';
import {ethers} from 'hardhat';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  const {deploy} = deployments;
  const registry = await ethers.getContract('MockOperatorFilterRegistry');

  await deploy('ERC1155OperatorFilteredUpgradeable', {
    from: deployer,
    contract: 'ERC1155OperatorFilteredUpgradeable',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: '__ERC1155OperatorFiltered_init',
        args: ['testURI.com', registry.address],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};

export default func;
func.tags = [
  'ERC1155OperatorFilteredUpgradeable',
  'ERC1155OperatorFilteredUpgradeable_deploy',
];
func.dependencies = ['OperatorFilterRegistry_deploy'];
func.skip = skipUnlessTestnet;
