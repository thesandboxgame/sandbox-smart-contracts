import {expect} from 'chai';
import {ethers, getNamedAccounts} from 'hardhat';
import {expectReceiptEventWithArgs, waitFor} from '../utils';
import {
  setupEstateSale,
  backendAuthWallet,
  zeroAddress,
  signAuthMessageAs,
} from './fixtures';

describe('EstateSaleWithAuth08', function () {
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

    const address = {
      buyer: deployer,
      to: deployer,
      reserved: zeroAddress,
    };

    const args = {
      info: [x, y, size, price],
      salt: salt,
      assetIds: assetIds,
      proof: proof,
      referral: '0x',
      signature: signature,
    };

    await approveSandForEstateSale(deployer, price);
    const contract = estateSaleWithAuthContract.connect(
      ethers.provider.getSigner(deployer)
    );

    const receipt = await waitFor(contract.buyLandWithSand(address, args));

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
    const contract = estateSaleWithAuthContract.connect(
      ethers.provider.getSigner(deployer)
    );

    const address = {
      buyer: deployer,
      to: deployer,
      reserved: zeroAddress,
    };

    const args = {
      info: [x, y, size, price],
      salt: salt,
      assetIds: assetIds,
      proof: proof,
      referral: '0x',
      signature: signature,
    };

    await expect(contract.buyLandWithSand(address, args)).to.be.revertedWith(
      `INVALID_AUTH`
    );
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
    const address = {
      buyer: deployer,
      to: deployer,
      reserved: zeroAddress,
    };
    const args = {
      info: [x, y, size, price],
      salt: salt,
      assetIds: assetIds,
      proof: proof,
      referral: '0x',
      signature: signature,
    };
    const encodedData = estateSaleWithAuthContract.interface.encodeFunctionData(
      'buyLandWithSand',
      [address, args]
    );
    const contract = sandContract.connect(ethers.provider.getSigner(deployer));

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
