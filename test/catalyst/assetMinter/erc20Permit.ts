import {ethers, getUnnamedAccounts, getNamedAccounts} from 'hardhat';
import {Address} from 'hardhat-deploy/types';
import {splitSignature, _TypedDataEncoder} from 'ethers/lib/utils';
import {BigNumber, Contract, constants} from 'ethers';
import {expect} from '../../chai-setup';
import catalysts from '../../../data/catalysts';
import gems from '../../../data/gems';
import {setupGemsAndCatalysts} from '../gemsCatalystsRegistry/fixtures';
import {setupAssetAttributesRegistry} from '../assetAttributesRegistry/fixtures';
import {setupAssetMinter, MintOptions, MintMultiOptions} from './fixtures';
import {setupAssetUpgrader} from '../assetUpgrader/fixtures';
import {mintCatalyst, mintGem} from '../utils';
import {expectEventWithArgs, findEvents, waitFor} from '../../utils';
import {setupPermit} from '../../permit/fixtures';
import {data712} from '../../permit/data712';

const zeroAddress = constants.AddressZero;
const TEST_AMOUNT = BigNumber.from(10).mul('1000000000000000000');

describe('Gems & Catalysts: Permit', function () {
  let luckGem: Contract;
  let epicCatalyst: Contract;
  let catalystOwner: Address;
  let gemOwner: Address;
  let user3: Address;
  let nonce: BigNumber;
  let deadline: BigNumber;

  before(async function () {
    ({
      luckGem,
      epicCatalyst,
      catalystOwner,
      gemOwner,
      user3,
    } = await setupGemsAndCatalysts());
    const setUp = await setupPermit();
    ({nonce, deadline} = setUp);
  });

  it('user can use permit function to approve Gems via signature', async function () {
    const approve = {
      owner: gemOwner,
      spender: user3,
      value: TEST_AMOUNT._hex,
      nonce: nonce._hex,
      deadline: deadline._hex,
    };
    const permitData712 = data712(luckGem, approve);
    const flatSig = await ethers.provider.send('eth_signTypedData', [
      gemOwner,
      permitData712,
    ]);
    const sig = splitSignature(flatSig);

    const gemAllowanceBefore = await luckGem.allowance(gemOwner, user3);
    expect(gemAllowanceBefore).to.equal(0);

    const receipt = await waitFor(
      luckGem.permit(
        gemOwner,
        user3,
        TEST_AMOUNT,
        deadline,
        sig.v,
        sig.r,
        sig.s
      )
    );

    const approvalEvent = await expectEventWithArgs(
      luckGem,
      receipt,
      'Approval'
    );
    expect(approvalEvent.args[0]).to.equal(gemOwner); // owner
    expect(approvalEvent.args[1]).to.equal(user3); // spender
    expect(approvalEvent.args[2]).to.equal(TEST_AMOUNT); // amount

    const gemAllowanceAfter = await luckGem.allowance(gemOwner, user3);
    expect(gemAllowanceAfter).to.equal('10000000000000000000');
  });

  it('user can use permit function to approve Catalysts via signature', async function () {
    const approve = {
      owner: catalystOwner,
      spender: user3,
      value: TEST_AMOUNT._hex,
      nonce: nonce._hex,
      deadline: deadline._hex,
    };
    const permitData712 = data712(epicCatalyst, approve);
    const flatSig = await ethers.provider.send('eth_signTypedData', [
      catalystOwner,
      permitData712,
    ]);
    const sig = splitSignature(flatSig);

    const catalystAlowanceBefore = await epicCatalyst.allowance(
      catalystOwner,
      user3
    );
    expect(catalystAlowanceBefore).to.equal(0);

    const receipt = await waitFor(
      epicCatalyst.permit(
        catalystOwner,
        user3,
        TEST_AMOUNT,
        deadline,
        sig.v,
        sig.r,
        sig.s
      )
    );

    const approvalEvent = await expectEventWithArgs(
      epicCatalyst,
      receipt,
      'Approval'
    );
    expect(approvalEvent.args[0]).to.equal(catalystOwner); // owner
    expect(approvalEvent.args[1]).to.equal(user3); // spender
    expect(approvalEvent.args[2]).to.equal(TEST_AMOUNT); // amount

    const catalystAllowanceAfter = await epicCatalyst.allowance(
      catalystOwner,
      user3
    );
    expect(catalystAllowanceAfter).to.equal('10000000000000000000');
  });

  // it('emits the Approval event', async function () {});

  // it('updates  _allowances ([owner][spender] = amount)', async function () {});

  // // require(deadline >= block.timestamp, "PAST_DEADLINE");
  // it('should fail if deadline < block.timestamp', async function () {});

  // // require(recoveredAddress != address(0) && recoveredAddress == owner, "INVALID_SIGNATURE")
  // it('should fail if recoveredAddress == address(0) || recoveredAddress != owner', async function () {});

  // // require(owner != address(0) && spender != address(0), "INVALID_OWNER_||_SPENDER");
  // it('should fail if owner == address(0) || spender == address(0)', async function () {});
});
