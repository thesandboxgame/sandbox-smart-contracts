import {expect} from '../../chai-setup';
import {ethers, getNamedAccounts} from 'hardhat';
import {expectReceiptEventWithArgs, waitFor} from '../../utils';
import {
  setupEstateSale,
  backendAuthWallet,
  zeroAddress,
  signAuthMessageAs,
} from './fixtures';

// test land data covers the following scenarios on L2:
// 1. land for sale (land[0])
// 2. premium land for sale (has bundleId) (land[3]; cannot use land[2] which has L1 tokenId format)
// 3. reserved land (only purchasable by the address set) (land[1])
// 4. multiple assetIds in bundle (land[4])
// 5. assetId is used more than once (land[5])

describe('PolygonEstateSaleWithAuth', function () {
  it('should be able to purchase a land with valid signature - no bundled assets', async function () {
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

  it('should NOT be able to purchase a land with invalid signature - no bundled assets', async function () {
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

  it('should be able to purchase a reserved land with valid signature to reserved address - no bundled assets', async function () {
    const {
      estateSaleWithAuthContract,
      proofs,
      approveSandForEstateSale,
    } = await setupEstateSale();
    const {sandboxAccount} = await getNamedAccounts();
    const {x, y, size, price, salt, proof, assetIds, reserved} = proofs[1];
    const signature = await signAuthMessageAs(
      backendAuthWallet,
      sandboxAccount,
      reserved,
      x,
      y,
      size,
      price,
      salt,
      assetIds,
      proof
    );
    await approveSandForEstateSale(sandboxAccount, price);
    const contract = await estateSaleWithAuthContract.connect(
      ethers.provider.getSigner(sandboxAccount)
    );

    const receipt = await waitFor(
      contract.buyLandWithSand(
        sandboxAccount,
        sandboxAccount,
        reserved,
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

  it('should NOT be able to purchase a reserved land if buyer is not reserved address - no bundled assets', async function () {
    const {
      estateSaleWithAuthContract,
      proofs,
      approveSandForEstateSale,
    } = await setupEstateSale();
    const {deployer, sandboxAccount} = await getNamedAccounts();
    const {x, y, size, price, salt, proof, assetIds, reserved} = proofs[1];
    const signature = await signAuthMessageAs(
      backendAuthWallet,
      sandboxAccount,
      reserved,
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
        sandboxAccount,
        reserved,
        [x, y, size, price],
        salt,
        assetIds,
        proof,
        '0x',
        signature
      )
    ).to.be.revertedWith(`RESERVED_LAND`);
  });

  it('should be able to purchase a land through sand contract - no bundled assets', async function () {
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

  it('should be able to purchase a land with valid signature - with bundled assets', async function () {
    const {
      estateSaleWithAuthContract,
      proofs,
      approveSandForEstateSale,
    } = await setupEstateSale();
    const {deployer} = await getNamedAccounts();

    const {x, y, size, price, salt, proof, assetIds} = proofs[3]; // this land is set up with assetIds, see core/data/landSales/EstateSaleWithAuth_0
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

  it('should be able to purchase a land through sand contract - with bundled assets', async function () {
    const {
      estateSaleWithAuthContract,
      sandContract,
      proofs,
    } = await setupEstateSale();
    const {deployer} = await getNamedAccounts();
    const {x, y, size, price, salt, proof, assetIds} = proofs[3];
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

  it('should NOT be able to purchase a land with invalid signature - with bundled assets', async function () {
    const {
      estateSaleWithAuthContract,
      proofs,
      approveSandForEstateSale,
    } = await setupEstateSale();
    const {deployer} = await getNamedAccounts();
    const {x, y, size, price, salt, proof, assetIds} = proofs[3];
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

  it('should be able to purchase a land with valid signature - with more than one bundled assets', async function () {
    const {
      estateSaleWithAuthContract,
      proofs,
      approveSandForEstateSale,
    } = await setupEstateSale();
    const {deployer} = await getNamedAccounts();

    const {x, y, size, price, salt, proof, assetIds} = proofs[4]; // this land is set up with assetIds, see core/data/landSales/EstateSaleWithAuth_0
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

  it('should be able to purchase more than 1 land that uses the same assetId', async function () {
    const {
      estateSaleWithAuthContract,
      proofs,
      approveSandForEstateSale,
    } = await setupEstateSale();
    const {deployer} = await getNamedAccounts();

    const {x, y, size, price, salt, proof, assetIds} = proofs[4]; // this land is set up with assetIds, see core/data/landSales/EstateSaleWithAuth_0
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

    const {x: x1, y: y1, size: size1, price: price1, salt:salt1, proof: proof1, assetIds: assetIds1} = proofs[5]; // this land is set up with assetIds, see core/data/landSales/EstateSaleWithAuth_0
    const signature1 = await signAuthMessageAs(
      backendAuthWallet,
      deployer,
      zeroAddress,
      x1,
      y1,
      size1,
      price1,
      salt1,
      assetIds1,
      proof1
    );
    await approveSandForEstateSale(deployer, price);

    const receipt1 = await waitFor(
      contract.buyLandWithSand(
        deployer,
        deployer,
        zeroAddress,
        [x1, y1, size1, price1],
        salt1,
        assetIds1,
        proof1,
        '0x',
        signature1
      )
    );

    await expectReceiptEventWithArgs(receipt1, 'LandQuadPurchased');
  });

  it('should NOT be able to use a signature more than once', async function () {
    const {
      estateSaleWithAuthContract,
      proofs,
      approveSandForEstateSale,
    } = await setupEstateSale();
    const {deployer} = await getNamedAccounts();

    const {x, y, size, price, salt, proof, assetIds} = proofs[4]; // this land is set up with assetIds, see core/data/landSales/EstateSaleWithAuth_0
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

    await approveSandForEstateSale(deployer, price);

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
    ).to.be.revertedWith("Already minted")
  });
});
