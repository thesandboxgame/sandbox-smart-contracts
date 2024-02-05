import {
  setupMainContract,
  setupOperatorFilter,
  setupRoyaltyRegistry,
} from '../fixtures';

export async function setupLand() {
  return setupMainContract('LandV3');
}

export async function setupLandOperatorFilter() {
  return setupOperatorFilter('LandV3');
}

export async function setupLandRoyaltyRegistry() {
  return setupRoyaltyRegistry();
}
