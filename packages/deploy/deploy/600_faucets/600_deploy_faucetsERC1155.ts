import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, catalystMinter} = await getNamedAccounts();
  await deploy('FaucetsERC1155', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/faucets/contracts/FaucetsERC1155.sol:FaucetsERC1155',
    log: true,
    skipIfAlreadyDeployed: true,
    args: [catalystMinter],
  });
};

func.tags = [
  'FaucetsERC1155',
  'FaucetsERC1155_deploy',
  DEPLOY_TAGS.L1,
  DEPLOY_TAGS.L1_TEST,
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_TEST,
];

export default func;
