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

// This is just an extra security measure so we avoid deploying external contracts to mainnet
export function isNotMainnet(hre: HardhatRuntimeEnvironment): boolean {
  return !isInTags(hre, 'mainnet');
}

// Helper function to fix a bug in hardhat-deploy for the "hardhat" network.
export function isInTags(hre: HardhatRuntimeEnvironment, key: string): boolean {
  return (
    (hre.network.tags && hre.network.tags[key]) ||
    (hre.network.config.tags && hre.network.config.tags.includes(key))
  );
}

export function isHardhat(hre: HardhatRuntimeEnvironment) {
  return hre.network.name === HARDHAT_NETWORK_NAME;
}

export const isTestnet = isNotMainnet;
export const skipUnlessIsTestnet = unless(isNotMainnet);
export const skipUnlessIsHardhat = unless(isHardhat);
export const skipUnlessIsL1 = unless(isL1);
export const skipUnlessIsL2 = unless(isL2);
