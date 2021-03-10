import {Contract} from 'ethers';
import {
  ethers,
  deployments,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';

export const setupERC20BasicApproveExtension = deployments.createFixture(
  async function () {
    const accounts = await getNamedAccounts();
    const others = await getUnnamedAccounts();
    const user0 = others[0];
    const user1 = others[1];
    await deployments.fixture();

    const sandContract = await ethers.getContract('Sand');
    const sandContractAsUser0 = await sandContract.connect(
      ethers.provider.getSigner(user0)
    );
    await deployments.deploy('EmptyContract', {
      from: accounts.deployer,
      args: [],
    });
    const emptyContract: Contract = await ethers.getContract('EmptyContract');

    await deployments.deploy('MockERC20BasicApprovalTarget', {
      from: accounts.deployer,
      args: [],
    });
    const mockERC20BasicApprovalTarget: Contract = await ethers.getContract(
      'MockERC20BasicApprovalTarget'
    );
    const estateSaleContract: Contract = await ethers.getContract(
      'EstateSaleWithFee'
    );
    const landSaleName = 'LandPreSale_5';
    // const landSaleContract: Contract = await ethers.getContract(landSaleName);
    return {
      estateSaleContract,
      mockERC20BasicApprovalTarget,
      emptyContract,
      sandContractAsUser0,
      sandContract,
      sandAdmin: accounts.sandAdmin,
      sandBeneficiary: accounts.sandBeneficiary,
      user0,
      user1,
    };
  }
);
