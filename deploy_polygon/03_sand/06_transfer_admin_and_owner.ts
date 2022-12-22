import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {sandAdmin} = await getNamedAccounts();
  const {read, execute, catchUnknownSigner} = deployments;
  const owner = await read('PolygonSand', 'owner');
  if (owner != sandAdmin) {
    await catchUnknownSigner(
      execute(
        'PolygonSand',
        {from: owner, log: true},
        'transferOwnership',
        sandAdmin
      )
    );
  }
  const admin = await read('PolygonSand', 'getAdmin');
  if (admin != sandAdmin) {
    await catchUnknownSigner(
      execute('PolygonSand', {from: admin, log: true}, 'changeAdmin', sandAdmin)
    );
  }
};

export default func;
func.tags = ['PolygonSand', 'PolygonSand_setup'];
func.dependencies = ['PolygonSand_deploy'];
