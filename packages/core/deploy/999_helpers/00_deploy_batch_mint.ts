import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import { skipUnlessL1 } from '../../utils/network';

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
  const isMinter = await read('Land', 'isMinter', batch.address);
  if (!isMinter) {
    const admin = await read('Land', 'getAdmin');
    await execute(
      'Land',
      {from: admin, log: true},
      'setMinter',
      batch.address,
      true
    );
  }
};
export default func;
func.skip = skipUnlessL1;
func.tags = ['DeployerBatchMint', 'DeployerBatchMint_deploy'];
