import {HardhatRuntimeEnvironment} from 'hardhat/types';

// Helper function to fix a bug in hardhat-deploy for the "hardhat" network.
export function isInTags(hre: HardhatRuntimeEnvironment, key: string): boolean {
  return hre.network.tags?.[key] || hre.network.config.tags?.includes(key);
}

export function isTestnet(hre: HardhatRuntimeEnvironment): boolean {
  return isInTags(hre, 'testnet');
}
