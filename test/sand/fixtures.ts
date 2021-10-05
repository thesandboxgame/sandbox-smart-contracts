import {gemsAndCatalystsFixtures} from '../common/fixtures/gemAndCatalysts';
import {erc20BasicApproveExtensionFixtures} from '../common/fixtures/erc20BasicApproveExtension';
import {withSnapshot} from '../utils';

export const setupGemsAndCatalysts = withSnapshot(
  ['GemsCatalystsRegistry_setup'],
  gemsAndCatalystsFixtures
);

export const setupERC20BasicApproveExtension = withSnapshot(
  ['Sand', 'LandPreSale_5', 'ERC20_PREDICATE'],
  erc20BasicApproveExtensionFixtures
);
