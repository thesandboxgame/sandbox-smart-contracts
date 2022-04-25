import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {assetAdmin} = await getNamedAccounts();

  await deploy('MockERC721Asset', {
    from: assetAdmin,
    args: ['Test nft 721', 'NFT721', 'http://nft-test/nft-721-{id}'],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['MockERC721Asset', 'MockERC721Asset_deploy'];
func.skip = skipUnlessTest; // TODO enable
