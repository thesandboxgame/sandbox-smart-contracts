import {ethers} from 'hardhat';
import {time} from '@nomicfoundation/hardhat-network-helpers';
import {parseUnits} from 'ethers';

const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
const ONE_GWEI = parseUnits('1', 'gwei');

export async function deployOneYearLockFixture() {
  const lockedAmount = ONE_GWEI;
  const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

  // Contracts are deployed using the first signer/account by default
  // Is a good idea to avoid using it by accident.
  const [deployer, owner, otherAccount] = await ethers.getSigners();

  const Lock = await ethers.getContractFactory('Lock');
  const lockAsDeployer = await Lock.deploy(unlockTime, {value: lockedAmount});
  const lockAsOwner = await lockAsDeployer.connect(owner);

  return {
    lockAsOwner,
    lockAsDeployer,
    unlockTime,
    lockedAmount,
    deployer,
    owner,
    otherAccount,
  };
}

// Upgradable contract can unit-tested used without a proxy. Just call deploy
// and then the initializer by hand.
// If your contract has something very specific that can change his behaviour
// when used with a Proxy then add OZ Proxy and hardhat-deploy dependencies
// to the project.
export async function deployOneYearLockUpgradableFixture() {
  const lockedAmount = ONE_GWEI;
  const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

  // Contracts are deployed using the first signer/account by default
  // Is a good idea to avoid using it by accident.
  const [deployer, owner, otherAccount] = await ethers.getSigners();

  const LockUpgradeable = await ethers.getContractFactory('LockUpgradeable');
  const lockAsDeployer = await LockUpgradeable.deploy();
  await lockAsDeployer.initialize(unlockTime, {value: lockedAmount});

  const lockAsOwner = await lockAsDeployer.connect(owner);

  return {
    lockAsOwner,
    lockAsDeployer,
    unlockTime,
    lockedAmount,
    deployer,
    owner,
    otherAccount,
  };
}
