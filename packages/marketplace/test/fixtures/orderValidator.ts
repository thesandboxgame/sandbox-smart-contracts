import {ethers, upgrades} from 'hardhat';
import {signerSetup} from './signers';

// keccak256("TSB_ROLE")
const TSBRole =
  '0x6278160ef7ca8a5eb8e5b274bcc0427c2cc7e12eee2a53c5989a1afb360f6404';
// keccak256("PARTNER_ROLE")
const PartnerRole =
  '0x2f049b28665abd79bc83d9aa564dba6b787ac439dba27b48e163a83befa9b260';

export async function orderValidatorFailSetup() {
  const {admin} = await signerSetup();

  const OrderValidatorFactory = await ethers.getContractFactory(
    'OrderValidator'
  );
  await upgrades.deployProxy(
    OrderValidatorFactory,
    [admin.address, [TSBRole, PartnerRole], [false], false],
    {
      initializer: '__OrderValidator_init_unchained',
    }
  );
}

export async function orderValidatorSetup() {
  const {user, admin} = await signerSetup();

  const OrderValidatorFactory = await ethers.getContractFactory(
    'OrderValidator'
  );
  const OrderValidatorAsDeployer = await upgrades.deployProxy(
    OrderValidatorFactory,
    [admin.address, [TSBRole, PartnerRole], [false, false], false],
    {
      initializer: '__OrderValidator_init_unchained',
    }
  );
  const OrderValidatorUpgradeMock = await ethers.getContractFactory(
    'OrderValidatorUpgradeMock'
  );
  const OrderValidatorAsUser = await OrderValidatorAsDeployer.connect(user);
  const OrderValidatorAsAdmin = await OrderValidatorAsDeployer.connect(admin);
  return {
    OrderValidatorAsDeployer,
    OrderValidatorUpgradeMock,
    OrderValidatorAsUser,
    OrderValidatorAsAdmin,
  };
}
