import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessL2, skipUnlessTestnet} from '../../utils/network';
import {ethers} from 'hardhat';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();
  const estateContract = await deployments.get('PolygonEstate');
  // TODO: Fake Game, right now we don't have the finished experience contract, fix this!!!
  await deployments.deploy('MockExperience', {
    from: deployer,
    args: [],
  });
  const experienceContract = await ethers.getContract(
    'MockExperience',
    deployer
  );
  const landContract = await deployments.get('PolygonLand');
  const mapLib = await deployments.get('MapLib');
  await deployments.deploy('PolygonExperienceEstateRegistry', {
    from: deployer,
    contract: 'ExperienceEstateRegistry',
    libraries: {
      MapLib: mapLib.address,
    },
    args: [
      estateContract.address,
      experienceContract.address,
      landContract.address,
    ],
  });
};

export default func;
func.tags = [
  'PolygonEstate',
  'PolygonEstateRegistry',
  'PolygonEstateRegistry_deploy',
];
func.dependencies = [
  'PolygonLand',
  'TRUSTED_FORWARDER',
  'Polygon_MapLib_deploy',
  'PolygonEstate_deploy',
];
func.skip = async (hre) =>
  (await skipUnlessTestnet(hre)) && (await skipUnlessL2(hre));
