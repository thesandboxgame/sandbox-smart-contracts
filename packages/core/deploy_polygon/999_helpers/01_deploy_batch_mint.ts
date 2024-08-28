import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute, read} = deployments;
  const {deployer, sandboxAccount} = await getNamedAccounts();
  const batch = await deploy(`Batch-${sandboxAccount}`, {
    contract: `Batch`,
    from: deployer,
    args: [sandboxAccount],
    log: true,
    skipIfAlreadyDeployed: true,
  });
  const isMinter = await read('PolygonLand', 'isMinter', batch.address);
  if (!isMinter) {
    const admin = await read('PolygonLand', 'getAdmin');
    await execute(
      'PolygonLand',
      {from: admin, log: true},
      'setMinter',
      batch.address,
      true
    );
  }
};
export default func;
func.tags = ['DeployerBatchMint', 'DeployerBatchMint_deploy'];
