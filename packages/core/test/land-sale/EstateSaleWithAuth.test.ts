import {expect} from '../chai-setup';
import {ethers, getNamedAccounts} from 'hardhat';
import {expectReceiptEventWithArgs, waitFor} from '../utils';
import {
  setupEstateSale,
  backendAuthWallet,
  zeroAddress,
  signAuthMessageAs,
} from './fixtures';

describe('EstateSaleWithAuth', function () {
  it('should be able to purchase with valid signature', async function () {
    const {
      estateSaleWithAuthContract,
      proofs,
      approveSandForEstateSale,
    } = await setupEstateSale();
    const {deployer} = await getNamedAccounts();
    const {x, y, size, price, salt, proof, assetIds} = proofs[0];
    const signature = await signAuthMessageAs(
      backendAuthWallet,
      deployer,
      zeroAddress,
      x,
      y,
      size,
      price,
      salt,
      assetIds,
      proof
    );
    await approveSandForEstateSale(deployer, price);
    const contract = await estateSaleWithAuthContract.connect(
      ethers.provider.getSigner(deployer)
    );

    const receipt = await waitFor(
      contract.buyLandWithSand(
        deployer,
        deployer,
        zeroAddress,
        [x, y, size, price],
        salt,
        assetIds,
        proof,
        '0x',
        signature
      )
    );

    await expectReceiptEventWithArgs(receipt, 'LandQuadPurchased');
  });

  it('should NOT be able to purchase with invalid signature', async function () {
    const {
      estateSaleWithAuthContract,
      proofs,
      approveSandForEstateSale,
    } = await setupEstateSale();
    const {deployer} = await getNamedAccounts();
    const {x, y, size, price, salt, proof, assetIds} = proofs[0];
    const wallet = await ethers.getSigner(deployer);
    const signature = await signAuthMessageAs(
      wallet,
      deployer,
      zeroAddress,
      x,
      y,
      size,
      price,
      salt,
      assetIds,
      proof
    );
    await approveSandForEstateSale(deployer, price);
    const contract = await estateSaleWithAuthContract.connect(
      ethers.provider.getSigner(deployer)
    );

    await expect(
      contract.buyLandWithSand(
        deployer,
        deployer,
        zeroAddress,
        [x, y, size, price],
        salt,
        assetIds,
        proof,
        '0x',
        signature
      )
    ).to.be.revertedWith(`INVALID_AUTH`);
  });

  it('should be able to purchase through sand contract', async function () {
    const {
      estateSaleWithAuthContract,
      sandContract,
      proofs,
    } = await setupEstateSale();
    const {deployer} = await getNamedAccounts();
    const {x, y, size, price, salt, proof, assetIds} = proofs[0];
    const signature = await signAuthMessageAs(
      backendAuthWallet,
      deployer,
      zeroAddress,
      x,
      y,
      size,
      price,
      salt,
      assetIds,
      proof
    );
    const encodedData = estateSaleWithAuthContract.interface.encodeFunctionData(
      'buyLandWithSand',
      [
        deployer,
        deployer,
        zeroAddress,
        [x, y, size, price],
        salt,
        assetIds,
        proof,
        '0x',
        signature,
      ]
    );
    const contract = await sandContract.connect(
      ethers.provider.getSigner(deployer)
    );

    await waitFor(
      contract.approveAndCall(
        estateSaleWithAuthContract.address,
        price,
        encodedData
      )
    );

    const landQuadPurchasedEvents = await estateSaleWithAuthContract.queryFilter(
      estateSaleWithAuthContract.filters.LandQuadPurchased()
    );
    expect(landQuadPurchasedEvents.length).to.eq(1);
  });
});
