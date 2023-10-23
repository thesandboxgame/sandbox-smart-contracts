import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {execute, read, catchUnknownSigner} = deployments;
  const {deployer, sandAdmin, sandExecutionAdmin} = await getNamedAccounts();

  const ERC20_ROLE = await read('OrderValidator', 'ERC20_ROLE');

  /* const TRUSTED_FORWARDER_V2 = await deployments.get('TRUSTED_FORWARDER_V2');
  let CHILD_CHAIN_MANAGER = await deployments.getOrNull('CHILD_CHAIN_MANAGER');
  if (!CHILD_CHAIN_MANAGER) {
    CHILD_CHAIN_MANAGER = await deploy('CHILD_CHAIN_MANAGER', {
      from: deployer,
      contract: 'FakeChildChainManager',
      log: true,
    });
  } */
  //let sandContract = await deployments.getOrNull('PolygonSand');
  let sandContract = await deployments.get('PolygonSand');

  /* if (!sandContract) {
    sandContract = await deploy('PolygonSand', {
      from: deployer,
      contract: 'PolygonSand',
      args: [
        CHILD_CHAIN_MANAGER.address,
        TRUSTED_FORWARDER_V2?.address,
        sandAdmin,
        sandExecutionAdmin,
      ],
      log: true,
    });
  } */

  if (
    !(await read('OrderValidator', 'hasRole', ERC20_ROLE, sandContract.address))
  ) {
    await catchUnknownSigner(
      execute(
        'OrderValidator',
        {from: sandAdmin, log: true},
        'grantRole',
        ERC20_ROLE,
        sandContract?.address
      )
    );
  }
};

export default func;
func.tags = ['OrderValidator', 'OrderValidator_set_whitelist_roles'];
func.dependencies = [
  'OrderValidator_deploy',
  'PolygonSand',
  'PolygonSand_deploy',
];
