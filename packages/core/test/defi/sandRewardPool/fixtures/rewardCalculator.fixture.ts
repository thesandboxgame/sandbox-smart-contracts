import {getUnnamedAccounts} from 'hardhat';
import {withSnapshot} from '../../../utils';

export const periodicSetup = withSnapshot([], async function (hre) {
  const contractName = 'PeriodicRewardCalculator';
  const durationInSeconds = 28 * 24 * 60 * 60;
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deployer} = await getNamedAccounts();
  const [
    admin,
    rewardPool,
    rewardDistribution,
    other,
  ] = await getUnnamedAccounts();

  // Taken from 01_deploy_mock_land_with_mint.ts
  await deployments.deploy(contractName, {
    from: deployer,
    args: [rewardPool, durationInSeconds],
  });
  const contract = await ethers.getContract(contractName, deployer);
  const contractAsAdmin = await ethers.getContract(contractName, admin);
  const contractAsRewardDistribution = await ethers.getContract(
    contractName,
    rewardDistribution
  );
  const contractAsRewardPool = await ethers.getContract(
    contractName,
    rewardPool
  );
  const REWARD_DISTRIBUTION = await contract.REWARD_DISTRIBUTION();
  await contract.grantRole(REWARD_DISTRIBUTION, rewardDistribution);
  return {
    durationInSeconds,
    contract,
    contractAsAdmin,
    contractAsRewardDistribution,
    contractAsRewardPool,
    rewardDistribution,
    admin,
    rewardPool,
    other,
  };
});

export const twoPeriodsSetup = withSnapshot([], async function (hre) {
  const contractName = 'TwoPeriodsRewardCalculatorV2';
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deployer} = await getNamedAccounts();
  const [
    admin,
    rewardPool,
    rewardDistribution,
    other,
  ] = await getUnnamedAccounts();

  // Taken from 01_deploy_mock_land_with_mint.ts
  await deployments.deploy(contractName, {
    from: deployer,
    args: [rewardPool],
  });
  const contract = await ethers.getContract(contractName, deployer);
  const contractAsAdmin = await ethers.getContract(contractName, admin);
  const contractAsRewardDistribution = await ethers.getContract(
    contractName,
    rewardDistribution
  );
  const contractAsRewardPool = await ethers.getContract(
    contractName,
    rewardPool
  );
  const REWARD_DISTRIBUTION = await contract.REWARD_DISTRIBUTION();
  await contract.grantRole(REWARD_DISTRIBUTION, rewardDistribution);
  return {
    contract,
    contractAsAdmin,
    contractAsRewardDistribution,
    contractAsRewardPool,
    rewardDistribution,
    admin,
    rewardPool,
    other,
  };
});
