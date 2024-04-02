import {expect} from 'chai';
import {setupEstateSale} from '../fixture';
import {ethers} from 'hardhat';

describe.only('EstateSaleWithAuth', function () {
  it('should deploy the EstateSaleWithAuth contract', async function () {
    const {EstateSaleWithAuth} = await setupEstateSale();
    const address = await EstateSaleWithAuth.getAddress();
    expect(address).to.be.properAddress;
  });
  it('should be able to purchase a land with valid signature - no bundled assets', async function () {
    const {
      EstateSaleWithAuth,
      deployer,
      signAuthMessageAs,
      proofs,
      approveSandForEstateSale,
    } = await setupEstateSale();
    const {x, y, size, price, salt, proof, assetIds} = proofs[0];
    const signature = await signAuthMessageAs(
      deployer,
      ethers.ZeroAddress,
      [x, y, size, price],
      salt,
      assetIds,
      proof
    );
    await approveSandForEstateSale(deployer, price);

    const signer = await ethers.provider.getSigner(deployer);
    await expect(
      await EstateSaleWithAuth.connect(signer).buyLandWithSand(
        deployer,
        deployer,
        ethers.ZeroAddress,
        [x, y, size, price],
        salt,
        assetIds,
        proof,
        '0x',
        signature
      )
    ).to.not.be.reverted;
  });
  it('should NOT be able to purchase a land with invalid signature - no bundled assets', async function () {
    const {
      EstateSaleWithAuth,
      deployer,
      signAuthMessageAs,
      proofs,
      approveSandForEstateSale,
    } = await setupEstateSale();
    const {x, y, size, price, salt, proof, assetIds} = proofs[0];
    const signature = await signAuthMessageAs(
      deployer,
      ethers.ZeroAddress,
      [x, y, size, price],
      salt,
      assetIds,
      proof
    );
    await approveSandForEstateSale(deployer, price);

    const signer = await ethers.provider.getSigner(deployer);
    await expect(
      EstateSaleWithAuth.connect(signer).buyLandWithSand(
        deployer,
        deployer,
        ethers.ZeroAddress,
        // Change the price to be invalid
        [x, y, size, '0'],
        salt,
        assetIds,
        proof,
        '0x',
        signature
      )
    ).to.be.revertedWith('INVALID_AUTH');
  });
  it('should be able to purchase a land with valid signature - with bundled assets', async function () {
    const {
      EstateSaleWithAuth,
      deployer,
      signAuthMessageAs,
      proofs,
      approveSandForEstateSale,
    } = await setupEstateSale();
    const {x, y, size, price, salt, proof, assetIds} = proofs[3];
    const signature = await signAuthMessageAs(
      deployer,
      ethers.ZeroAddress,
      [x, y, size, price],
      salt,
      assetIds,
      proof
    );
    await approveSandForEstateSale(deployer, price);

    const signer = await ethers.provider.getSigner(deployer);
    await expect(
      await EstateSaleWithAuth.connect(signer).buyLandWithSand(
        deployer,
        deployer,
        ethers.ZeroAddress,
        [x, y, size, price],
        salt,
        assetIds,
        proof,
        '0x',
        signature
      )
    ).to.not.be.reverted;
  });
  it('should NOT be able to purchase a land with invalid signature - with bundled assets', async function () {
    const {
      EstateSaleWithAuth,
      deployer,
      signAuthMessageAs,
      proofs,
      approveSandForEstateSale,
    } = await setupEstateSale();
    const {x, y, size, price, salt, proof, assetIds} = proofs[3];
    const signature = await signAuthMessageAs(
      deployer,
      ethers.ZeroAddress,
      [x, y, size, price],
      salt,
      assetIds,
      proof
    );
    await approveSandForEstateSale(deployer, price);

    const signer = await ethers.provider.getSigner(deployer);
    await expect(
      EstateSaleWithAuth.connect(signer).buyLandWithSand(
        deployer,
        deployer,
        ethers.ZeroAddress,
        [x, y, size, price],
        salt,
        [
          '41506478881403507969696680653240014914910929820314476107906210059990541021187',
        ],
        proof,
        '0x',
        signature
      )
    ).to.be.revertedWith('INVALID_AUTH');
  });
  it('should be able to purchase a reserved land with valid signature to reserved address - no bundled assets', async function () {
    const {
      EstateSaleWithAuth,
      deployer,
      sandBeneficiary,
      signAuthMessageAs,
      proofs,
      approveSandForEstateSale,
    } = await setupEstateSale();
    const {x, y, size, price, salt, proof, assetIds} = proofs[2];
    const signature = await signAuthMessageAs(
      sandBeneficiary,
      sandBeneficiary,
      [x, y, size, price],
      salt,
      assetIds,
      proof
    );
    await approveSandForEstateSale(sandBeneficiary, price);

    const signer = await ethers.provider.getSigner(sandBeneficiary);
    await expect(
      await EstateSaleWithAuth.connect(signer).buyLandWithSand(
        sandBeneficiary,
        sandBeneficiary,
        sandBeneficiary,
        [x, y, size, price],
        salt,
        assetIds,
        proof,
        '0x',
        signature
      )
    ).to.not.be.reverted;
  });
  it('should be able to purchase a land through sand contract - no bundled assets', async function () {
    const {
      EstateSaleWithAuth,
      signAuthMessageAs,
      proofs,
      deployer,
      PolygonSand,
    } = await setupEstateSale();
    const {x, y, size, price, salt, proof, assetIds} = proofs[0];

    const signature = await signAuthMessageAs(
      deployer,
      ethers.ZeroAddress,
      [x, y, size, price],
      salt,
      assetIds,
      proof
    );

    const encodedData = EstateSaleWithAuth.interface.encodeFunctionData(
      'buyLandWithSand',
      [
        deployer,
        deployer,
        ethers.ZeroAddress,
        [x, y, size, price],
        salt,
        assetIds,
        proof,
        '0x',
        signature,
      ]
    );

    const PolygonSandContract = PolygonSand.connect(
      await ethers.provider.getSigner(deployer)
    );

    expect(
      await PolygonSandContract.approveAndCall(
        await EstateSaleWithAuth.getAddress(),
        price,
        encodedData
      )
    ).to.not.be.reverted;
  });
  it('should be able to purchase a land through sand contract - with bundled assets', async function () {
    const {
      EstateSaleWithAuth,
      signAuthMessageAs,
      proofs,
      deployer,
      PolygonSand,
    } = await setupEstateSale();
    const {x, y, size, price, salt, proof, assetIds} = proofs[3];

    const signature = await signAuthMessageAs(
      deployer,
      ethers.ZeroAddress,
      [x, y, size, price],
      salt,
      assetIds,
      proof
    );

    const encodedData = EstateSaleWithAuth.interface.encodeFunctionData(
      'buyLandWithSand',
      [
        deployer,
        deployer,
        ethers.ZeroAddress,
        [x, y, size, price],
        salt,
        assetIds,
        proof,
        '0x',
        signature,
      ]
    );

    const PolygonSandContract = PolygonSand.connect(
      await ethers.provider.getSigner(deployer)
    );

    expect(
      await PolygonSandContract.approveAndCall(
        await EstateSaleWithAuth.getAddress(),
        price,
        encodedData
      )
    ).to.not.be.reverted;
  });
  it('should be able to purchase a land with valid signature - with more than one bundled assets', async function () {
    const {
      EstateSaleWithAuth,
      deployer,
      signAuthMessageAs,
      proofs,
      approveSandForEstateSale,
    } = await setupEstateSale();
    const {x, y, size, price, salt, proof, assetIds} = proofs[1];
    const signature = await signAuthMessageAs(
      deployer,
      ethers.ZeroAddress,
      [x, y, size, price],
      salt,
      assetIds,
      proof
    );
    await approveSandForEstateSale(deployer, price);

    const signer = await ethers.provider.getSigner(deployer);
    await expect(
      await EstateSaleWithAuth.connect(signer).buyLandWithSand(
        deployer,
        deployer,
        ethers.ZeroAddress,
        [x, y, size, price],
        salt,
        assetIds,
        proof,
        '0x',
        signature
      )
    ).to.not.be.reverted;
  });
  it('should be able to purchase more than 1 land that uses the same assetId', async function () {
    const {
      EstateSaleWithAuth,
      deployer,
      signAuthMessageAs,
      proofs,
      approveSandForEstateSale,
    } = await setupEstateSale();
    const {x, y, size, price, salt, proof, assetIds} = proofs[1];
    const signature = await signAuthMessageAs(
      deployer,
      ethers.ZeroAddress,
      [x, y, size, price],
      salt,
      assetIds,
      proof
    );
    await approveSandForEstateSale(deployer, price);

    const signer = await ethers.provider.getSigner(deployer);
    await expect(
      await EstateSaleWithAuth.connect(signer).buyLandWithSand(
        deployer,
        deployer,
        ethers.ZeroAddress,
        [x, y, size, price],
        salt,
        assetIds,
        proof,
        '0x',
        signature
      )
    ).to.not.be.reverted;

    const {
      x: x2,
      y: y2,
      size: size2,
      price: price2,
      salt: salt2,
      proof: proof2,
      assetIds: assetIds2,
    } = proofs[3];
    const signature2 = await signAuthMessageAs(
      deployer,
      ethers.ZeroAddress,
      [x2, y2, size2, price2],
      salt2,
      assetIds2,
      proof2
    );
    await approveSandForEstateSale(deployer, price2);

    await expect(
      await EstateSaleWithAuth.connect(signer).buyLandWithSand(
        deployer,
        deployer,
        ethers.ZeroAddress,
        [x2, y2, size2, price2],
        salt2,
        assetIds2,
        proof2,
        '0x',
        signature2
      )
    ).to.not.be.reverted;
  });
  it('should NOT be able to use a signature more than once', async function () {
    const {
      EstateSaleWithAuth,
      deployer,
      signAuthMessageAs,
      proofs,
      approveSandForEstateSale,
    } = await setupEstateSale();
    const {x, y, size, price, salt, proof, assetIds} = proofs[1];
    const signature = await signAuthMessageAs(
      deployer,
      ethers.ZeroAddress,
      [x, y, size, price],
      salt,
      assetIds,
      proof
    );
    await approveSandForEstateSale(deployer, (BigInt(price) * 2n).toString());

    const signer = await ethers.provider.getSigner(deployer);
    await expect(
      await EstateSaleWithAuth.connect(signer).buyLandWithSand(
        deployer,
        deployer,
        ethers.ZeroAddress,
        [x, y, size, price],
        salt,
        assetIds,
        proof,
        '0x',
        signature
      )
    ).to.not.be.reverted;

    await expect(
      EstateSaleWithAuth.connect(signer).buyLandWithSand(
        deployer,
        deployer,
        ethers.ZeroAddress,
        [x, y, size, price],
        salt,
        assetIds,
        proof,
        '0x',
        signature
      )
    ).to.be.revertedWith('Already minted');
  });
});
