const {BigNumber} = require('ethers');
const {assert} = require('chai-local');
const {setupEstateSale} = require('./fixtures');
const {emptyBytes, zeroAddress} = require('testUtils');


describe('Estate:Sales', function() {
  it('purchase an estate', async function () {
    const {estateContract, landContract, saleContract, lands, getProof, user0, user1} = await setupEstateSale();
    const land = lands.find((l) => l.size === 6);
    const proof = getProof(land);
    const x = land.x;
    const y = land.y;
    const size = land.size;
    const sandPrice = land.price;
    const salt = land.salt;
    const tx = await saleContract.connect(saleContract.provider.getSigner(user0)).functions.buyLandWithETH(
      user0,
      user1,
      zeroAddress,
      x, y, size,
      sandPrice,
      salt,
      proof,
      emptyBytes, // referral
      {value: BigNumber.from('30000000000000000000')}
    );
    await tx.wait();

    // const topCornerId = x + (y * 408);
    // const landOwner = await contracts.Land.callStatic.ownerOf(topCornerId);
    // assert.equal(landOwner, contracts.Estate.address);

    for (let sx = 0; sx < size; sx++) {
      for (let sy = 0; sy < size; sy++) {
        const id = x + sx + ((y + sy) * 408);
        const landOwner = await landContract.callStatic.ownerOf(id);
        assert.equal(landOwner, estateContract.address);
      }
    }

    const estateOwner = await estateContract.callStatic.ownerOf(1);
    assert.equal(estateOwner, user1);
  });

  it('purchase an estate and burnAndTransferFrom', async function () {
    const {estateContract, landContract, saleContract, lands, getProof, user0, user1, user2} = await setupEstateSale();
    const land = lands.find((l) => l.size === 6);
    const proof = getProof(land);
    const x = land.x;
    const y = land.y;
    const size = land.size;
    const sandPrice = land.price;
    const salt = land.salt;
    await saleContract.connect(saleContract.provider.getSigner(user0)).functions.buyLandWithETH(
      user0,
      user1,
      zeroAddress,
      x, y, size,
      sandPrice,
      salt,
      proof,
      emptyBytes, // referral
      {value: BigNumber.from('30000000000000000000')}
    ).then((tx) => tx.wait());

    const estateId = 1;

    await estateContract.connect(estateContract.provider.getSigner(user1)).functions.burnAndTransferFrom(
      user1,
      estateId,
      user2
    ).then((tx) => tx.wait());

    for (let sx = 0; sx < size; sx++) {
      for (let sy = 0; sy < size; sy++) {
        const id = x + sx + ((y + sy) * 408);
        const landOwner = await landContract.callStatic.ownerOf(id);
        assert.equal(landOwner, user2);
      }
    }
  });
});