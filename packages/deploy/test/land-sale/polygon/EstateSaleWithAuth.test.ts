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
});
