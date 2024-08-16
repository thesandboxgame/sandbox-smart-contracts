import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {sandAdmin} = await getNamedAccounts();

  const ERC1776_OPERATOR_ROLE = await read('Exchange', 'ERC1776_OPERATOR_ROLE');
  const EXCHANGE_ADMIN_ROLE = await read('Exchange', 'EXCHANGE_ADMIN_ROLE');

  let sandContract;
  let landContract;
  if (hre.network.name === 'polygon') {
    sandContract = await deployments.get('PolygonSand');
    landContract = await deployments.get('PolygonLand');
  } else {
    sandContract = await deployments.get('Sand');
    landContract = await deployments.get('Land');
  }

  const hasERC1776OperatorRole = await read(
    'Exchange',
    'hasRole',
    ERC1776_OPERATOR_ROLE,
    sandContract.address
  );
  if (!hasERC1776OperatorRole) {
    await catchUnknownSigner(
      execute(
        'Exchange',
        {from: sandAdmin, log: true},
        'grantRole',
        ERC1776_OPERATOR_ROLE,
        sandContract.address
      )
    );
  }

  const hasExchangeAdminRole = await read(
    'Exchange',
    'hasRole',
    EXCHANGE_ADMIN_ROLE,
    sandAdmin
  );
  if (!hasExchangeAdminRole) {
    await catchUnknownSigner(
      execute(
        'Exchange',
        {from: sandAdmin, log: true},
        'grantRole',
        EXCHANGE_ADMIN_ROLE,
        sandAdmin
      )
    );
  }

  const currentLand = await read('Exchange', 'landContract');
  if (currentLand != landContract.address) {
    await catchUnknownSigner(
      execute(
        'Exchange',
        {from: sandAdmin, log: true},
        'setLandContract',
        landContract.address
      )
    );
  }
};

export default func;
func.tags = [
  'Exchange',
  'Exchange_setup',
  DEPLOY_TAGS.L1,
  DEPLOY_TAGS.L1_PROD,
  DEPLOY_TAGS.L1_TEST,
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = [
  'Exchange_deploy',
  'Sand_deploy',
  'Land_deploy',
  'PolygonSand_deploy',
  'PolygonLand_deploy',
  'ExchangeV2_deploy',
];
