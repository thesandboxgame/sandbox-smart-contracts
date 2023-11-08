import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {signerSetup} from './signerFixtures';
import {ethers, upgrades} from 'hardhat';

// keccak256("TSB_ROLE")
const TSBRole =
  '0x6278160ef7ca8a5eb8e5b274bcc0427c2cc7e12eee2a53c5989a1afb360f6404';
// keccak256("PARTNER_ROLE")
const PartnerRole =
  '0x2f049b28665abd79bc83d9aa564dba6b787ac439dba27b48e163a83befa9b260';
// keccak256("ERC20_ROLE")
const ERC20Role =
  '0x839f6f26c78a3e8185d8004defa846bd7b66fef8def9b9f16459a6ebf2502162';

export async function orderValidatorSetup() {
  const {admin, user} = await loadFixture(signerSetup);

  const OrderValidatorFactory = await ethers.getContractFactory(
    'OrderValidator'
  );
  const OrderValidatorAsDeployer = await upgrades.deployProxy(
    OrderValidatorFactory,
    [
      admin.address,
      [TSBRole, PartnerRole, ERC20Role],
      [false, false, false],
      true,
    ],
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
    OrderValidatorAsAdmin,
    OrderValidatorAsUser,
    OrderValidatorUpgradeMock,
  };
}
