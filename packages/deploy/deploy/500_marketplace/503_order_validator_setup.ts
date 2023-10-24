import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {sandAdmin} = await getNamedAccounts();
  const ERC20_ROLE = await read('OrderValidator', 'ERC20_ROLE');
  const sandContract = await deployments.get('PolygonSand');
  const hasRole = await read(
    'OrderValidator',
    'hasRole',
    ERC20_ROLE,
    sandContract.address
  );
  if (!hasRole) {
    await catchUnknownSigner(
      execute(
        'OrderValidator',
        {from: sandAdmin, log: true},
        'grantRole',
        ERC20_ROLE,
        sandContract.address
      )
    );
  }
};

export default func;
func.tags = ['OrderValidator', 'OrderValidator_setup'];
func.dependencies = [
  'OrderValidator_deploy',
  'PolygonSand',
  'PolygonSand_deploy',
];
