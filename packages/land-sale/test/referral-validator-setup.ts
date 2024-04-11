import {ethers} from 'hardhat';

const referralValiatorSetup = async () => {
  const [_, initialSigningWallet] = await ethers.getSigners();

  const ReferralValidatorFactory =
    await ethers.getContractFactory('ReferralValidator');
  const initialMaxCommissionRate = 1000;
  const ReferralValidatorContract = await ReferralValidatorFactory.deploy(
    initialSigningWallet,
    initialMaxCommissionRate,
  );

  return {
    ReferralValidatorContract,
  };
};

export default referralValiatorSetup;
