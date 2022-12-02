import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute, catchUnknownSigner} = deployments;
  const {deployer, ozdRelayer, sandAdmin} = await getNamedAccounts();

  const Batch = await deploy('RelayerBatch', {
    from: deployer,
    contract: 'Batch',
    args: [ozdRelayer],
    skipIfAlreadyDeployed: true,
    log: true,
  });

  await catchUnknownSigner(
    execute(
      'PolygonSand',
      {from: sandAdmin, log: true},
      'setSuperOperator',
      Batch.address,
      false
    )
  );
};

export default func;
func.tags = ['RelayerBatch', 'RelayerBatch_deploy'];
func.dependencies = ['PolygonSand_deploy'];
