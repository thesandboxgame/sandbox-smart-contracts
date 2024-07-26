import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {sandAdmin} = await getNamedAccounts();
  const owner = await read('RoyaltiesRegistry', 'owner');
  if (owner != sandAdmin) {
    await catchUnknownSigner(
      execute(
        'RoyaltiesRegistry',
        {from: owner, log: true},
        'transferOwnership',
        sandAdmin
      )
    );
  }
};

export default func;
func.tags = [
  'RoyaltiesRegistry',
  'RoyaltiesRegistry_setup',
  DEPLOY_TAGS.L1,
  DEPLOY_TAGS.L1_PROD,
  DEPLOY_TAGS.L1_TEST,
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = ['RoyaltiesRegistry_deploy'];
