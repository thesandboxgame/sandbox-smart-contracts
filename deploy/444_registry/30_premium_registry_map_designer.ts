import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessL1} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {sandAdmin: adminUser, mapDesigner} = await getNamedAccounts();
  const {execute, read, catchUnknownSigner} = deployments;
  const MAP_DESIGNER_ROLE = await read(
    'PremiumLandRegistry',
    'MAP_DESIGNER_ROLE'
  );
  await catchUnknownSigner(
    execute(
      'PremiumLandRegistry',
      {from: adminUser, log: true},
      'grantRole',
      MAP_DESIGNER_ROLE,
      mapDesigner
    )
  );
};

export default func;
func.tags = ['PremiumRegistry', 'PremiumRegistry_map_designer'];
func.dependencies = ['PremiumRegistry_deploy'];
func.skip = skipUnlessL1;
