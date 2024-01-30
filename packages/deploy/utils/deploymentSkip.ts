import 'dotenv/config';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {HARDHAT_NETWORK_NAME} from 'hardhat/plugins';

export function unless(
  ...funcs: ((hre: HardhatRuntimeEnvironment) => boolean)[]
): (hre: HardhatRuntimeEnvironment) => Promise<boolean> {
  return async (hre: HardhatRuntimeEnvironment) => !funcs.every((x) => x(hre));
}

export function isL1(hre: HardhatRuntimeEnvironment): boolean {
  return isInTags(hre, 'L1');
}

export function isL2(hre: HardhatRuntimeEnvironment): boolean {
  return isInTags(hre, 'L2');
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function isFork(hre: HardhatRuntimeEnvironment): boolean {
  return !!process.env.HARDHAT_FORK;
}

export function isNotFork(hre: HardhatRuntimeEnvironment): boolean {
  return !isFork(hre);
}

// Helper function to fix a bug in hardhat-deploy for the "hardhat" network.
export function isInTags(hre: HardhatRuntimeEnvironment, key: string): boolean {
  if (isFork(hre)) {
    return hre.config.networks[process.env.HARDHAT_FORK].tags.includes(key);
  }
  return (
    (hre.network.tags && hre.network.tags[key]) ||
    (hre.network.config.tags && hre.network.config.tags.includes(key))
  );
}

export function isHardhat(hre: HardhatRuntimeEnvironment) {
  return hre.network.name === HARDHAT_NETWORK_NAME;
}
