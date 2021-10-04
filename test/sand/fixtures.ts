import {deployments} from 'hardhat';
import {gemsAndCatalystsFixtures} from '../common/fixtures/gemAndCatalysts';
import {erc20BasicApproveExtensionFixtures} from '../common/fixtures/erc20BasicApproveExtension';

export const setupGemsAndCatalysts = deployments.createFixture(
  gemsAndCatalystsFixtures
);

export const setupERC20BasicApproveExtension = deployments.createFixture(
  erc20BasicApproveExtensionFixtures
);
