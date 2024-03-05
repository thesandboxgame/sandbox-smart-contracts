import {BigNumber} from 'ethers';
import {parseEther} from 'ethers/lib/utils';
import {ethers} from 'hardhat';
const runSetup = async () => {
  const [
    deployer,
    admin,
    manager,
    distributor,
    recipient1,
    recipient2,
    creator1,
    creator2,
  ] = await ethers.getSigners();

  const initialTierValues = [
    parseEther('0'),
    parseEther('100'),
    parseEther('200'),
  ];

  const initialRecipients = [
    {address: recipient1.address, split: 200},
    {address: recipient2.address, split: 500},
  ];

  // get the TestERC20 contract factory
  const VaultTokenFactory = await ethers.getContractFactory('TestERC20');
  const VaultTokenContract = await VaultTokenFactory.connect(deployer).deploy(
    'Vault Token',
    'VT'
  );

  const LazyVaultFactory = await ethers.getContractFactory('LazyVault');
  const LazyVaultContract = await LazyVaultFactory.connect(deployer).deploy(
    admin.address,
    manager.address,
    distributor.address,
    initialTierValues,
    initialRecipients.map((recipient) => Object.values(recipient)),
    VaultTokenContract.address
  );
  await LazyVaultContract.deployed();

  await VaultTokenContract.connect(deployer).mint(
    LazyVaultContract.address,
    parseEther('1000')
  );

  const AuthValidatorContractAsAdmin = await LazyVaultContract.connect(
    deployer
  );

  const DISTRIBUTOR_ROLE = await LazyVaultContract.DISTRIBUTOR_ROLE();
  const MANAGER_ROLE = await LazyVaultContract.MANAGER_ROLE();

  const calculateTotalToDistribute = (tiers: number[], amounts: number[]) => {
    let totalToDistribute = BigNumber.from(0);
    for (let i = 0; i < tiers.length; i++) {
      totalToDistribute = totalToDistribute.add(
        initialTierValues[tiers[i]].mul(amounts[i])
      );
    }
    return totalToDistribute;
  };

  return {
    deployer,
    admin,
    manager,
    distributor,
    recipient1,
    recipient2,
    creator1,
    creator2,
    initialRecipients,
    initialTierValues,
    VaultTokenContract,
    LazyVaultContract,
    AuthValidatorContractAsAdmin,
    DISTRIBUTOR_ROLE,
    MANAGER_ROLE,
    calculateTotalToDistribute,
  };
};

export default runSetup;
