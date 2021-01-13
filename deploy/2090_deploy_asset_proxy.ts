import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction, DeploymentSubmission} from 'hardhat-deploy/types';
import {Contract} from 'ethers';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts, upgrades} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const sandContract = await deployments.get('Sand');
  const Asset = await ethers.getContractFactory('Asset');

  const asset = await upgrades.deployProxy(
    Asset,
    [sandContract.address, deployer, deployer],
    {initializer: 'init', unsafeAllowCustomTypes: true}
  );

  await asset.deployed();
  // @todo does this this save impl or proxy address?
  //@note type error: Argument of type 'Contract' is not assignable to parameter of type 'DeploymentSubmission'.
  // await deployments.save('Asset', asset);
  console.log('Asset deployed to:', asset.address);
};
export default func;
func.tags = ['Asset', 'Asset_deploy'];
func.dependencies = ['Sand', 'Sand_deploy'];
