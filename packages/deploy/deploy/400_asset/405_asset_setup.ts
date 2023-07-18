import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, log, read, catchUnknownSigner} = deployments;
  const {assetAdmin, catalystAdmin, backendAuthWallet} =
    await getNamedAccounts();

  const assetCreate = await deployments.get('AssetCreate');
  const assetReveal = await deployments.get('AssetReveal');

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

  const catMinterRole = await read('Catalyst', 'MINTER_ROLE');
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
    log(`Catalyst MINTER_ROLE granted to ${assetCreate.address}`);
  }

  await catchUnknownSigner(
    execute(
      'AssetAuthValidator',
      {from: assetAdmin, log: true},
      'setSigner',
      assetCreate.address,
      backendAuthWallet
    )
  );

  log(`AssetAuthValidator signer for Asset Create set to ${backendAuthWallet}`);

  await catchUnknownSigner(
    execute(
      'AssetAuthValidator',
      {from: assetAdmin, log: true},
      'setSigner',
      assetReveal.address,
      backendAuthWallet
    )
  );

  log(`AssetAuthValidator signer for Asset Reveal set to ${backendAuthWallet}`);
};

export default func;

func.tags = ['Asset', 'Asset_role_setup'];
func.dependencies = ['Asset_deploy', 'Catalyst_deploy', 'AssetCreate_deploy'];
