import {
  ethers,
  deployments,
  getNamedAccounts,
} from 'hardhat';


type Options = {
  mint?: boolean;
  mintSingleAsset?: number;
  assetsHolder?: boolean;
};

export const setupAuthValidator = deployments.createFixture(async function (
  hre,
  options?: Options
) {
  await deployments.fixture(['AuthValidator']);
  const authValidatorContract = await ethers.getContract('AuthValidator');
  const backendAuthWallet = new ethers.Wallet("0x4242424242424242424242424242424242424242424242424242424242424242")
  return {
    backendAuthWallet,
    authValidatorContract,
    hre,
    options,
    getNamedAccounts
  };
});
