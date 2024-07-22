import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../../hardhat.config';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {sandAdmin} = await getNamedAccounts();
  const contract = await deployments.get('LandMetadataRegistry');
  const metadataRegistry = await read('PolygonLand', 'getMetadataRegistry');
  if (metadataRegistry != contract.address) {
    await catchUnknownSigner(
      execute(
        'PolygonLand',
        {from: sandAdmin, log: true},
        'setMetadataRegistry',
        contract.address
      )
    );
  }
};

export default func;
func.tags = [
  'PolygonLand',
  'PolygonLandV3_setup',
  'PolygonLandMetadataRegistry',
  'PolygonLandMetadataRegistry_setup',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = [
  'PolygonLandMetadataRegistry_deploy',
  'PolygonLandV3_deploy',
  'PolygonLand_setup',
];
