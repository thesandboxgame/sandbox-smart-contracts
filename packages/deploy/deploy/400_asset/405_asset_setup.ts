import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, log, read, catchUnknownSigner} = deployments;
  const {assetAdmin} = await getNamedAccounts();

  const assetCreate = await deployments.get('AssetCreate');
  const minterRole = await read('Asset', 'MINTER_ROLE');
  if (!(await read('Asset', 'hasRole', minterRole, assetCreate.address))) {
    await catchUnknownSigner(
      execute(
        'Asset',
        {from: assetAdmin, log: true},
        'grantRole',
        minterRole,
        assetCreate.address
      )
    );
    log(`MINTER_ROLE granted to ${assetCreate.address}`);
  }
};
export default func;

func.tags = ['Asset', 'Asset_role_setup'];
func.dependencies = ['Asset_deploy', 'AssetCreate_deploy'];
