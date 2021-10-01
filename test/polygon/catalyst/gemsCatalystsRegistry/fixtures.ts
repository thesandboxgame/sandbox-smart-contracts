import {deployments} from 'hardhat';
import {gemsAndCatalystsFixtures} from '../../../common/fixtures/gemAndCatalysts';

export const setupGemsAndCatalysts = deployments.createFixture(
  gemsAndCatalystsFixtures
);
