import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  await deploy('OperatorFilterRegistry', {
    from: deployer,
    contract:
      'contracts/mocks/MockOperatorFilterRegistry.sol:MockOperatorFilterRegistry',
    log: true,
  });
  const Asset = await deployments.get('Asset');
  const OperatorFilterAssetSubscription = await deployments.get(
    'OperatorFilterAssetSubscription'
  );
  await deployments.execute(
    'OperatorFilterRegistry',
    {from: deployer, log: true},
    'registerSubscription',
    Asset.address,
    OperatorFilterAssetSubscription.address
  );
};
export default func;
func.tags = [
  'Asset',
  'OperatorFilterAssetSubscription',
  'MockOperatorFilterRegistry_deploy',
];
