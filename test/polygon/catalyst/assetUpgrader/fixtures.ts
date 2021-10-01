import {deployments} from 'hardhat';
import {assetUpgraderFixtures} from '../../../common/fixtures/assetUpgrader';

export const setupAssetUpgrader = deployments.createFixture(
  assetUpgraderFixtures
);
