import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessL2, skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();

  await deployments.deploy('MapLib', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['PolygonMapLib', 'PolygonMapLib_deploy'];
func.dependencies = [];
func.skip = async (hre) =>
  (await skipUnlessTestnet(hre)) && (await skipUnlessL2(hre));
