import {expect} from 'chai';
import referralValiatorSetup from './referral-validator-setup';

describe('ReferralValidator (/packages/land-sale/contracts/ReferralValidator/ReferralValidator.sol)', function () {
  it('should deploy the ReferralValidator contract', async function () {
    const {ReferralValidatorContract} = await referralValiatorSetup();
    const address = await ReferralValidatorContract.getAddress();
    expect(address).to.be.properAddress;
  });
});
