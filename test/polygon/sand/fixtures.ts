import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';

import {setupUser, setupUsers, withSnapshot} from '../../utils';
import {Contract} from 'ethers';
import {AbiCoder} from 'ethers/lib/utils';
import {erc20BasicApproveExtensionFixtures} from '../../common/fixtures/erc20BasicApproveExtension';

import {sendMetaTx} from '../../sendMetaTx';
import {expectEventWithArgsFromReceipt, waitFor} from '../../utils';
import {BigNumber, BigNumberish, PopulatedTransaction} from 'ethers';
import {expect} from '../../chai-setup';

const abiCoder = new AbiCoder();

export const setupMainnetSand = withSnapshot(
  ['Land', 'Sand', 'LandPreSale_5', 'ERC20_PREDICATE'], // TODO: review for Polygon ?
  erc20BasicApproveExtensionFixtures
);

type User = {address: string; sand: Contract; trustedForwarder: Contract};
export type Fixtures = {
  sand: Contract;
  users: User[];
  sandBeneficiary: User;
  deployer: User;
  childChainManager: Contract;
  trustedForwarder: Contract;
  mockERC20BasicApprovalTarget: Contract;
};
export const setupPolygonSand = withSnapshot(['PolygonSand'], async () => {
  const sand = await ethers.getContract('PolygonSand');
  const accounts = await getNamedAccounts();
  const unnamedAccounts = await getUnnamedAccounts();
  const childChainManager = await ethers.getContract('CHILD_CHAIN_MANAGER');
  const trustedForwarder = await ethers.getContract('TRUSTED_FORWARDER_V2');
  const users = await setupUsers(unnamedAccounts, {
    sand,
    trustedForwarder,
  });
  const sandBeneficiary = await setupUser(accounts.sandBeneficiary, {
    sand,
    trustedForwarder,
  });
  const deployer = await setupUser(accounts.deployer, {
    sand,
    trustedForwarder,
  });
  await deployments.deploy('MockERC20BasicApprovalTarget', {
    from: accounts.deployer,
    args: [],
  });
  const mockERC20BasicApprovalTarget: Contract = await ethers.getContract(
    'MockERC20BasicApprovalTarget'
  );
  return {
    sand,
    users,
    sandBeneficiary,
    deployer,
    childChainManager,
    trustedForwarder,
    mockERC20BasicApprovalTarget,
  };
});

// The only way to deposit in L2 is via the childChainManager
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const depositViaChildChainManager = async (
  fixtures: {
    sand: Contract;
    users?: User[];
    sandBeneficiary?: User;
    deployer?: User;
    childChainManager: Contract;
    trustedForwarder?: Contract;
    mockERC20BasicApprovalTarget?: Contract;
  },
  user: string,
  amount: BigNumberish
) => {
  // Lock tokens on ERC20 predicate contract
  const pre = BigNumber.from(await fixtures.sand.balanceOf(user));
  const data = abiCoder.encode(['uint256'], [amount.toString()]);
  await waitFor(
    fixtures.childChainManager.callSandDeposit(
      fixtures.sand.address,
      user,
      data
    )
  );
  expect(await fixtures.sand.balanceOf(user)).to.be.equal(pre.add(amount));
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const sendMeta = async (
  fixtures: {
    sand: Contract;
    users: User[];
    sandBeneficiary?: User;
    deployer?: User;
    childChainManager: Contract;
    trustedForwarder: Contract;
    mockERC20BasicApprovalTarget?: Contract;
  },
  signer: string,
  populatedTx: Promise<PopulatedTransaction>
) => {
  const {data} = await populatedTx;
  // users[3] pay for the gas, of a message signed by signer.
  const receipt = await sendMetaTx(
    fixtures.sand.address,
    fixtures.users[3].trustedForwarder,
    data,
    signer
  );
  const event = await expectEventWithArgsFromReceipt(
    fixtures.trustedForwarder,
    receipt,
    'TXResult'
  );
  expect(event.args.success).to.be.true;
};
