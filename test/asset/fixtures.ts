import {deployments} from 'hardhat';
import {assetFixtures} from '../common/fixtures/asset';
// import asset_regenerate_and_distribute from '../../setup/asset_regenerate_and_distribute';

export const setupAsset = deployments.createFixture(assetFixtures);
