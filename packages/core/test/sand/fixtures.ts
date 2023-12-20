import {erc20BasicApproveExtensionFixtures} from '../common/fixtures/erc20BasicApproveExtension';
import {withSnapshot} from '../utils';

export const setupERC20BasicApproveExtension = withSnapshot(
  ['Sand', 'LandPreSale_5', 'ERC20_PREDICATE'],
  erc20BasicApproveExtensionFixtures
);
