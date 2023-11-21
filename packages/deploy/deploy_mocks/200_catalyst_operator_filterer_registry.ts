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
  const Catalyst = await deployments.get('Catalyst');
  const OperatorFilterCatalystSubscription = await deployments.get(
    'OperatorFilterCatalystSubscription'
  );
  await deployments.execute(
    'OperatorFilterRegistry',
    {from: deployer, log: true},
    'registerSubscription',
    Catalyst.address,
    OperatorFilterCatalystSubscription.address
  );
};
export default func;
func.tags = [
  'Catalyst',
  'OperatorFilterCatalystSubscription',
  'MockOperatorFilterRegistry_deploy',
];
