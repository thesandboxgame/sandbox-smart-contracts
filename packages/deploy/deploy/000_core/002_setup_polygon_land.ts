import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

export const royaltyAmount = 500;

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;

  const {sandAdmin} = await getNamedAccounts();
  const currentAdmin = await read('PolygonLand', {}, 'getAdmin');
  if (currentAdmin !== sandAdmin) {
    await catchUnknownSigner(
      execute(
        'PolygonLand',
        {from: currentAdmin, log: true},
        'changeAdmin',
        sandAdmin
      )
    );
  }
};

export default func;
func.tags = ['PolygonLand', 'PolygonLand_setup', 'L2'];
func.dependencies = ['PolygonLand_deploy'];
