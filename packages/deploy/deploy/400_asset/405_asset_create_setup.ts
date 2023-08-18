import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, log, read, catchUnknownSigner} = deployments;
  const {assetAdmin, catalystAdmin, backendAuthWallet, assetPauser} =
    await getNamedAccounts();

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
    log(`Asset MINTER_ROLE granted to ${assetCreate.address}`);
  }

  const pauserRole = await read('AssetCreate', 'PAUSER_ROLE');
  if (!(await read('AssetCreate', 'hasRole', pauserRole, assetPauser))) {
    await catchUnknownSigner(
      execute(
        'AssetCreate',
        {from: assetAdmin, log: true},
        'grantRole',
        pauserRole,
        assetPauser
      )
    );
    log(`AssetCreate PAUSER_ROLE granted to ${assetPauser}`);
  }

  const catMinterRole = await read('Catalyst', 'BURNER_ROLE');
  if (
    !(await read('Catalyst', 'hasRole', catMinterRole, assetCreate.address))
  ) {
    await catchUnknownSigner(
      execute(
        'Catalyst',
        {from: catalystAdmin, log: true},
        'grantRole',
        catMinterRole,
        assetCreate.address
      )
    );
    log(`Catalyst BURNER_ROLE granted to ${assetCreate.address}`);
  }

  await catchUnknownSigner(
    execute(
      'AuthSuperValidator',
      {from: assetAdmin, log: true},
      'setSigner',
      assetCreate.address,
      backendAuthWallet
    )
  );

  log(`AuthSuperValidator signer for Asset Create set to ${backendAuthWallet}`);
};

export default func;

func.tags = ['Asset', 'AssetCreate_setup'];
func.dependencies = ['Asset_deploy', 'Catalyst_deploy', 'AssetCreate_deploy'];
