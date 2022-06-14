import {setupEstate} from './fixtures';
import {toWei, waitFor} from '../utils';
import {expect} from '../chai-setup';
import {ethers} from 'hardhat';

describe('Estate Simple Test', function () {
  it('start with lands', async function () {
    const {
      sandContractAsBeneficiary,
      estateContract,
      landContract,
      user0,
      minter,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const bytes = '0x3333';

    // await childChainManager.callDeposit(user0,
    //   ethers.utils.defaultAbiCoder.encode(['uint256'], [toWei(10)]));
    await sandContractAsBeneficiary.transfer(user0, toWei(10));

    //Minting Land
    await waitFor(
      landContract
        .connect(ethers.provider.getSigner(minter))
        .mintQuad(user0, 12, 0, 0, bytes)
    );

    await waitFor(
      landContract
        .connect(ethers.provider.getSigner(minter))
        .mintQuad(user0, 3, 12, 12, bytes)
    );

    await waitFor(
      landContract
        .connect(ethers.provider.getSigner(minter))
        .mintQuad(user0, 1, 12, 11, bytes)
    );

    //Approving tokens
    await waitFor(
      landContract
        .connect(ethers.provider.getSigner(user0))
        .setApprovalForAllFor(user0, estateContract.address, true)
    );
    //Estate minting
    await waitFor(
      estateContract.connect(ethers.provider.getSigner(user0)).create(
        [
          [12, 1, 3],
          [0, 12, 12],
          [0, 11, 12],
        ],
        uri
      )
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenCreated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenCreated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
  });
});
