import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, multiGiveawayAdmin} = await getNamedAccounts();

  const TRUSTED_FORWARDER_V2 = await deployments.getOrNull(
    'TRUSTED_FORWARDER_V2'
  );

  await deploy('Multi_Giveaway_2', {
    contract: 'MultiGiveaway',
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [
      multiGiveawayAdmin,
      TRUSTED_FORWARDER_V2?.address ||
        '0x0000000000000000000000000000000000000000',
    ], // admin, trustedForwarder
  });
};
export default func;
func.tags = ['Multi_Giveaway_2', 'Multi_Giveaway_2_deploy'];
func.dependencies = [];
