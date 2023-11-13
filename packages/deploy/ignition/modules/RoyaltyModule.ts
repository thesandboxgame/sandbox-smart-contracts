import {buildModule} from '@nomicfoundation/hardhat-ignition/modules';

export default buildModule('RoyaltyModule', (m) => {
  const splitter = m.contract('RoyaltySplitter');

  return {splitter};
});
