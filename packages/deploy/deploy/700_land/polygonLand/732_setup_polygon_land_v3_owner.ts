import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {sandAdmin, commonRoyaltyReceiver} = await getNamedAccounts();
  const owner = await read('PolygonLand', 'owner');
  if (owner != commonRoyaltyReceiver) {
    await catchUnknownSigner(
      execute(
        'PolygonLand',
        {from: sandAdmin, log: true},
        'transferOwnership',
        commonRoyaltyReceiver
      )
    );
  }
};

export default func;
func.tags = [
  'PolygonLand',
  'PolygonLandV3_setup',
  'PolygonLandOwner',
  'PolygonLandOwner_setup',
  'L2',
];
func.dependencies = ['PolygonLandV3_deploy', 'PolygonLand_setup'];
