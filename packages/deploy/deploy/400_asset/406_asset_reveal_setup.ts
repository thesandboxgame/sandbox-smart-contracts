import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, log, read, catchUnknownSigner} = deployments;
  const {assetAdmin} = await getNamedAccounts();

  const assetReveal = await deployments.get('AssetReveal');

  const minterRole = await read('Asset', 'MINTER_ROLE');
  if (!(await read('Asset', 'hasRole', minterRole, assetReveal.address))) {
    await catchUnknownSigner(
      execute(
        'Asset',
        {from: assetAdmin, log: true},
        'grantRole',
        minterRole,
        assetReveal.address
      )
    );
    log(`Asset MINTER_ROLE granted to ${assetReveal.address}`);
  }
};

export default func;

func.tags = ['Asset', 'Asset_Reveal_role_setup'];
func.dependencies = ['Asset_deploy', 'Catalyst_deploy', 'AssetCreate_deploy'];
