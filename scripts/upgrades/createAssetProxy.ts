import {HardhatRuntimeEnvironment} from 'hardhat/types';
const {ethers, upgrades, hre} = require('hardhat');
const {deployments, getNamedAccounts} = hre;

async function main() {
  const {deployer} = await getNamedAccounts();

  // @todo add error handling , Sand may not be deployed yet
  const sandContract = await deployments.get('Sand');
  const Asset = await ethers.getContractFactory('Asset');

  const asset = await upgrades.deployProxy(
    Asset,
    [sandContract.address, deployer, deployer],
    {initializer: 'init', unsafeAllowCustomTypes: true}
  );

  await asset.deployed();

  // @todo does this this save impl or proxy address?
  await deployments.save('Asset', asset);
  console.log('Asset deployed to:', asset.address);
}

main();
