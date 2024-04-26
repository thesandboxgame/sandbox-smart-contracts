import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, sandAdmin, sandExecutionAdmin} = await getNamedAccounts();

  const TRUSTED_FORWARDER_V2 = await deployments.get('TRUSTED_FORWARDER_V2');
  const CHILD_CHAIN_MANAGER = await deployments.get('CHILD_CHAIN_MANAGER');

  await deploy('PolygonSand', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/core/src/solc_0.8/polygon/child/sand/PolygonSand.sol:PolygonSand',
    args: [
      CHILD_CHAIN_MANAGER.address,
      TRUSTED_FORWARDER_V2?.address,
      sandAdmin,
      sandExecutionAdmin,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['PolygonSand', 'PolygonSand_deploy', 'L2'];
func.dependencies = ['CHILD_CHAIN_MANAGER', 'TRUSTED_FORWARDER_V2'];
