import {
  ethers,
  deployments,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';

export const setupERC20BasicApproveExtension = deployments.createFixture(
  async function () {
    const {sandAdmin, sandBeneficiary} = await getNamedAccounts();
    const others = await getUnnamedAccounts();
    const user0 = others[0];
    const user1 = others[1];
    await deployments.fixture();

    const sandContract = await ethers.getContract('Sand');
    const sandContractAsUser0 = await sandContract.connect(
      ethers.provider.getSigner(user0)
    );
    return {
      sandContractAsUser0,
      sandContract,
      sandAdmin,
      sandBeneficiary,
      user0,
      user1,
    };
  }
);
