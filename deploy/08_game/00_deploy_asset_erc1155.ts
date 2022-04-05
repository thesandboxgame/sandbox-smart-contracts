import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {assetAdmin} = await getNamedAccounts();

  await deploy('GameAsset1155', {
    from: assetAdmin,
    args: ['http://nft-test/nft-1155-{id}'],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['GameAsset1155', 'GameAsset1155_deploy'];
func.skip = skipUnlessTest; // TODO enable
