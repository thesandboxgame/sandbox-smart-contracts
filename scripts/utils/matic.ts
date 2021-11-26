import hre from 'hardhat';

export function isMumbai(): boolean {
  return hre.network.name === 'mumbai' || process.env.HARDHAT_FORK === 'mumbai';
}

export function ifNotMumbaiThrow(): void {
  if (!isMumbai()) {
    throw new Error(
      `This script must be run on mumbai, invalid network ${hre.network.name}`
    );
  }
}
