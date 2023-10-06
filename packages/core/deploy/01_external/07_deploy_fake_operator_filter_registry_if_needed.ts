import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const operatorFilterRegistry = await deployments.getOrNull(
    'OperatorFilterRegistry'
  );

  if (!operatorFilterRegistry) {
    const mockMarketPlace1 = await deploy('MockMarketPlace1', {
      from: deployer,
      args: [],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    const mockMarketPlace2 = await deploy('MockMarketPlace2', {
      from: deployer,
      args: [],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    const defaultSubscription = '0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6';

    await deploy('OperatorFilterRegistry', {
      from: deployer,
      contract: 'MockOperatorFilterRegistry',
      args: [
        defaultSubscription,
        [mockMarketPlace1.address, mockMarketPlace2.address],
      ],
      log: true,
      skipIfAlreadyDeployed: true,
    });
  }
};
export default func;
func.tags = ['OperatorFilterRegistry', 'L1'];
func.skip = skipUnlessTest;
