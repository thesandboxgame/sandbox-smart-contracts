import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {assetAdmin} = await getNamedAccounts();

  await deploy('MockERC1155Asset', {
    from: assetAdmin,
    args: ['http://nft-test/nft-1155-{id}'],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['MockERC1155Asset', 'MockERC1155Asset_deploy'];
func.skip = skipUnlessTest; // TODO enable
