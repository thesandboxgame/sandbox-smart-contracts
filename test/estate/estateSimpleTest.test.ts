import {setupEstate} from './fixtures';
import {expectEventWithArgsFromReceipt, toWei, waitFor} from '../utils';
import {expect} from '../chai-setup';
import {ethers} from 'hardhat';

describe.only('Estate test with maps', function () {
  it('start with free lands', async function () {
    const {
      sandContractAsBeneficiary,
      estateContract,
      estateMinterContract,
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
        .mintQuad(user0, 3, 18, 18, bytes)
    );

    //Approving tokens
    await waitFor(
      landContract
        .connect(ethers.provider.getSigner(user0))
        .setApprovalForAllFor(user0, estateContract.address, true)
    );
    //Estate minting
    await waitFor(
      estateMinterContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate([
          [
            [12, 3],
            [0, 18],
            [0, 18],
          ],
          uri,
        ])
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
  });

  it('start and add games', async function () {
    const {
      sandContractAsBeneficiary,
      estateContract,
      estateMinterContract,
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
        .mintQuad(user0, 6, 30, 30, bytes)
    );

    //Approving tokens
    await waitFor(
      landContract
        .connect(ethers.provider.getSigner(user0))
        .setApprovalForAllFor(user0, estateContract.address, true)
    );

    await waitFor(
      estateMinterContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate([[[12], [0], [0]], uri])
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);

    let estateId;
    if (estateCreationEvent[0].args) {
      estateId = estateCreationEvent[0].args[1];
      await waitFor(
        estateMinterContract
          .connect(ethers.provider.getSigner(user0))
          .updateLandsEstate({
            quadsToAdd: [[6], [30], [30]],
            quadsToRemove: [[12], [0], [0]],
            estateId,
            uri,
          })
      );
    }
  });
});
