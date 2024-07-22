import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, log, read, catchUnknownSigner} = deployments;
  const {assetAdmin, backendAuthWallet, assetPauser} = await getNamedAccounts();

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

  const pauserRole = await read('AssetReveal', 'PAUSER_ROLE');
  if (!(await read('AssetReveal', 'hasRole', pauserRole, assetPauser))) {
    await catchUnknownSigner(
      execute(
        'AssetReveal',
        {from: assetAdmin, log: true},
        'grantRole',
        pauserRole,
        assetPauser
      )
    );
    log(`AssetReveal PAUSER_ROLE granted to ${assetPauser}`);
  }

  const burnerRole = await read('Asset', 'BURNER_ROLE');
  if (!(await read('Asset', 'hasRole', burnerRole, assetReveal.address))) {
    await catchUnknownSigner(
      execute(
        'Asset',
        {from: assetAdmin, log: true},
        'grantRole',
        burnerRole,
        assetReveal.address
      )
    );
    log(`Asset BURNER_ROLE granted to ${assetReveal.address}`);
  }

  await catchUnknownSigner(
    execute(
      'AuthSuperValidator',
      {from: assetAdmin, log: true},
      'setSigner',
      assetReveal.address,
      backendAuthWallet
    )
  );

  log(`AuthSuperValidator signer for Asset Reveal set to ${backendAuthWallet}`);

  await catchUnknownSigner(
    execute(
      'AssetReveal',
      {from: assetAdmin, log: true},
      'setTierInstantRevealAllowed',
      5,
      true
    )
  );

  log(`Allowed instant reveal for tier 5 assets (Mythical))`);
};

export default func;

func.tags = [
  'AssetReveal_setup',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = ['Asset_deploy', 'AssetCreate_deploy'];
