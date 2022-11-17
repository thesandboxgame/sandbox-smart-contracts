import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessL1} from '../../utils/network';
import {ethers} from 'hardhat';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments} = hre;
  const {execute, catchUnknownSigner} = deployments;
  const land = await ethers.getContract('Land');
  const adminUser = await land.getAdmin();
  const registry = await deployments.get('PremiumLandRegistry');
  await catchUnknownSigner(
    execute(
      'Land',
      {from: adminUser, log: true},
      'setPremiumRegistry',
      registry.address
    )
  );
};

export default func;
func.tags = ['PremiumRegistry', 'PremiumRegistry_setup'];
func.dependencies = ['PremiumRegistry_deploy', 'LandV4_deploy'];
func.skip = skipUnlessL1;
