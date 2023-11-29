import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {sandAdmin} = await getNamedAccounts();

  const ERC20_ROLE = await read('OrderValidator', 'ERC20_ROLE');
  const TSB_ROLE = await read('OrderValidator', 'TSB_ROLE');
  const PARTNER_ROLE = await read('OrderValidator', 'PARTNER_ROLE');

  const SandContract = await deployments.get('PolygonSand');
  const AssetContract = await deployments.get('Asset');

  const addressesToGrant = [];
  addressesToGrant[ERC20_ROLE] = [SandContract.address];
  addressesToGrant[TSB_ROLE] = [AssetContract.address];
  addressesToGrant[PARTNER_ROLE] = [];

  for (const role in addressesToGrant) {
    for (const address of addressesToGrant[role]) {
      const hasRole = await read('OrderValidator', 'hasRole', role, address);

      if (!hasRole) {
        await catchUnknownSigner(
          execute(
            'OrderValidator',
            {from: sandAdmin, log: true},
            'grantRole',
            role,
            address
          )
        );
      }
    }
  }

  const currentWhitelistsEnabled = await read(
    'OrderValidator',
    'isWhitelistsEnabled'
  );
  const whitelistsEnabled = true;

  if (currentWhitelistsEnabled != whitelistsEnabled) {
    if (whitelistsEnabled) {
      await catchUnknownSigner(
        execute(
          'OrderValidator',
          {from: sandAdmin, log: true},
          'enableWhitelists'
        )
      );
    } else {
      await catchUnknownSigner(
        execute(
          'OrderValidator',
          {from: sandAdmin, log: true},
          'disableWhitelists'
        )
      );
    }
  }

  const rolesEnabled = [];
  rolesEnabled[TSB_ROLE] = true;
  rolesEnabled[PARTNER_ROLE] = false;

  for (const role in rolesEnabled) {
    const isRoleEnabled = await read('OrderValidator', 'isRoleEnabled', role);

    if (isRoleEnabled != rolesEnabled[role]) {
      if (rolesEnabled[role]) {
        await catchUnknownSigner(
          execute(
            'OrderValidator',
            {from: sandAdmin, log: true},
            'enableRole',
            role
          )
        );
      } else {
        await catchUnknownSigner(
          execute(
            'OrderValidator',
            {from: sandAdmin, log: true},
            'disableRole',
            role
          )
        );
      }
    }
  }
};

export default func;
func.tags = ['OrderValidator', 'OrderValidator_setup'];
func.dependencies = [
  'OrderValidator_deploy',
  'PolygonSand_deploy',
  'Asset_deploy',
];
