import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

// AssetERC721 can be only minted in L2, when moved to L1 the polygon predicate is in charge of minting them.
const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {assetAdmin} = await getNamedAccounts();

  const predicate = await deployments.get('AssetERC721Tunnel');

  // Grant roles.
  const minterRole = await deployments.read('AssetERC721', 'MINTER_ROLE');
  await deployments.execute(
    'AssetERC721',
    {from: assetAdmin, log: true},
    'grantRole',
    minterRole,
    predicate.address
  );
};

export default func;
func.tags = ['AssetERC721_setup'];
func.runAtTheEnd = true;
func.dependencies = ['AssetERC721_deploy', 'AssetERC721Tunnel_deploy'];
func.skip = skipUnlessTestnet;
