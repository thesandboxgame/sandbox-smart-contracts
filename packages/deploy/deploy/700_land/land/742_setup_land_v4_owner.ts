import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../../hardhat.config';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {sandAdmin, commonEIP173Owner} = await getNamedAccounts();
  const owner = await read('Land', 'owner');
  if (owner != commonEIP173Owner) {
    await catchUnknownSigner(
      execute(
        'Land',
        {from: sandAdmin, log: true},
        'transferOwnership',
        commonEIP173Owner
      )
    );
  }
};

export default func;
func.tags = [
  'Land',
  'LandV4_setup',
  'LandOwner',
  'LandOwner_setup',
  DEPLOY_TAGS.L1,
  DEPLOY_TAGS.L1_PROD,
  DEPLOY_TAGS.L1_TEST,
];
func.dependencies = ['LandV4_deploy'];
