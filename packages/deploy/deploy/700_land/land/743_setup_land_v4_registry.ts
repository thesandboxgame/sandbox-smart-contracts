import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {sandAdmin} = await getNamedAccounts();
  const contract = await deployments.get('LandMetadataRegistry');
  const metadataRegistry = await read('Land', 'getMetadataRegistry');
  if (metadataRegistry != contract.address) {
    await catchUnknownSigner(
      execute(
        'Land',
        {from: sandAdmin, log: true},
        'setMetadataRegistry',
        contract.address
      )
    );
  }
};

export default func;
func.tags = [
  'Land',
  'LandV4_setup',
  'LandMetadataRegistry',
  'LandMetadataRegistry_setup',
  'L1',
];
func.dependencies = ['LandMetadataRegistry_deploy', 'LandV4_deploy'];
