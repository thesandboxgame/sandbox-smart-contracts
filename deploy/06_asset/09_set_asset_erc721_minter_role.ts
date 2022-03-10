import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

// AssetERC721 can be only minted in L2, when moved to L1 the polygon predicate is in charge of minting them.
const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {sandAdmin} = await getNamedAccounts();
  const adminRole = sandAdmin;

  const predicate = await deployments.get('MINTABLE_ERC721_PREDICATE');

  // Grant roles.
  const minterRole = await deployments.read('AssetERC721', 'MINTER');
  await deployments.execute(
    'AssetERC721',
    {from: adminRole, log: true},
    'grantRole',
    minterRole,
    predicate.address
  );
};

export default func;
func.tags = ['AssetERC721', 'AssetERC721_setup'];
func.dependencies = ['AssetERC721_deploy', 'MINTABLE_ERC721_PREDICATE'];
func.skip = skipUnlessTestnet;
