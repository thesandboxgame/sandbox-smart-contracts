import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  await deploy('RoyaltySplitter', {
    from: deployer,
    log: true,
    contract:
      '@sandbox-smart-contracts/dependency-royalty-management/contracts/RoyaltySplitter.sol:RoyaltySplitter',
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = [
  'RoyaltySplitter',
  'RoyaltySplitter_deploy',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
