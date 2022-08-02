import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const predicate = await deployments.getOrNull('MINTABLE_ERC721_PREDICATE');
  if (!predicate) {
    await deploy('MINTABLE_ERC721_PREDICATE', {
      from: deployer,
      contract: 'FakeMintableERC721Predicate',
      log: true,
    });
  }
};
export default func;
func.tags = ['MINTABLE_ERC721_PREDICATE'];
func.skip = skipUnlessTest;
