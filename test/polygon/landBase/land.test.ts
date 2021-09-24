import {expect} from '../../chai-setup';
import {ethers, deployments, getUnnamedAccounts} from 'hardhat';
import {Contract, BigNumber} from 'ethers';
import {setupUsers, waitFor} from '../../utils';

type User = {
  address: string;
  MockLandWithMint: Contract;
};

const setupTest = deployments.createFixture(
  async (): Promise<{
    MockLandWithMint: Contract;
    landOwners: User[];
  }> => {
    await deployments.fixture('MockLandWithMint');
    const MockLandWithMint = await ethers.getContract('MockLandWithMint');
    const unnamedAccounts = await getUnnamedAccounts();
    const landOwners = await setupUsers(unnamedAccounts, {MockLandWithMint});
    return {MockLandWithMint, landOwners};
  }
);

describe('MockLandWithMint.sol', function () {
  describe('Mint and transfer full quad', function () {
    it('testing transferQuad', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          12,
          0,
          0,
          bytes
        )
      );

      const num = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );
      expect(num).to.equal(144);
      await waitFor(
        landOwners[0].MockLandWithMint.transferQuad(
          landOwners[0].address,
          landOwners[1].address,
          12,
          0,
          0,
          bytes
        )
      );
      const num1 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );
      expect(num1).to.equal(0);
      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(144);
    });
  });

  describe('Mint and transfer a smaller quad', function () {
    it('transfering a 3X3 quad from a 12x12', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          12,
          12,
          12,
          bytes
        )
      );
      const num = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );
      expect(num).to.equal(144);

      await waitFor(
        landOwners[0].MockLandWithMint.transferQuad(
          landOwners[0].address,
          landOwners[1].address,
          3,
          12,
          12,
          bytes
        )
      );

      const num1 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );

      expect(num1).to.equal(135);

      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );

      expect(num2).to.equal(9);
    });
  });

  describe('Mint 1x1 and transfer it', function () {
    it('Mint and transfer 1x1', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          1,
          1,
          1,
          bytes
        )
      );
      const num = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );
      expect(num).to.equal(1);

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          1,
          2,
          1,
          bytes
        )
      );

      const num1 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );
      expect(num1).to.equal(2);

      await waitFor(
        landOwners[0].MockLandWithMint.transferQuad(
          landOwners[0].address,
          landOwners[1].address,
          1,
          1,
          1,
          bytes
        )
      );

      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );

      expect(num2).to.equal(1);

      const num3 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );

      expect(num3).to.equal(1);
    });
  });

  describe('Mint and transfer all its smaller quads', function () {
    it('transfering a 1X1 quad from a 3x3', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          3,
          3,
          3,
          bytes
        )
      );
      const num = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );
      expect(num).to.equal(9);

      for (let x = 3; x < 6; x++) {
        for (let y = 3; y < 6; y++) {
          await waitFor(
            landOwners[0].MockLandWithMint.transferQuad(
              landOwners[0].address,
              landOwners[1].address,
              1,
              x,
              y,
              bytes
            )
          );
        }
      }

      //landowner2 will burn all his land
      for (let x = 3; x < 6; x++) {
        for (let y = 3; y < 6; y++) {
          await waitFor(
            landOwners[1].MockLandWithMint.burn(
              0x0000000000000000000000000000000000000000000000000000000000000000 +
                (x + y * 408)
            )
          );
        }
      }

      const num1 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );

      expect(num1).to.equal(0);

      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );

      expect(num2).to.equal(0);

      await expect(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          3,
          3,
          3,
          bytes
        )
      ).to.be.revertedWith('Already minted as 3x3');
    });
  });

  describe('transfer batch', function () {
    it('testing batchTransferQuad', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          24,
          0,
          0,
          bytes
        )
      );
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          12,
          300,
          300,
          bytes
        )
      );
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          6,
          30,
          30,
          bytes
        )
      );
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          3,
          24,
          24,
          bytes
        )
      );
      await waitFor(
        landOwners[0].MockLandWithMint.batchTransferQuad(
          landOwners[0].address,
          landOwners[1].address,
          [24, 12, 6, 3],
          [0, 300, 30, 24],
          [0, 300, 30, 24],
          bytes
        )
      );
      const num1 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );
      expect(num1).to.equal(0);
      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(765);
    });
  });

  describe('GasTest for single transfer', function () {
    it('testing transfering 10 lands', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          1,
          1,
          1,
          bytes
        )
      );

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          3,
          3,
          3,
          bytes
        )
      );

      let gasTotal = BigNumber.from('0');

      for (let i = 3; i < 6; i++) {
        for (let j = 3; j < 6; j++) {
          const receipt = await waitFor(
            landOwners[0].MockLandWithMint.transferQuad(
              landOwners[0].address,
              landOwners[1].address,
              1,
              i,
              j,
              bytes
            )
          );
          gasTotal = gasTotal.add(receipt.gasUsed);
        }
      }

      const receipt = await waitFor(
        landOwners[0].MockLandWithMint.transferQuad(
          landOwners[0].address,
          landOwners[1].address,
          1,
          1,
          1,
          bytes
        )
      );
      gasTotal = gasTotal.add(receipt.gasUsed);
      console.log('GAS USED ' + gasTotal.toString()); //receipt.gasUsed.toString());
    });

    it('testing transfering 50 lands', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      for (let i = 1; i < 6; i++) {
        await waitFor(
          landOwners[0].MockLandWithMint.mintQuad(
            landOwners[0].address,
            1,
            i,
            i,
            bytes
          )
        );
      }

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          3,
          18,
          18,
          bytes
        )
      );

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          6,
          54,
          54,
          bytes
        )
      );

      let gasTotal = BigNumber.from('0');

      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          const receipt = await waitFor(
            landOwners[0].MockLandWithMint.transferQuad(
              landOwners[0].address,
              landOwners[1].address,
              1,
              54 + i,
              54 + j,
              bytes
            )
          );
          gasTotal = gasTotal.add(receipt.gasUsed);
        }
      }

      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const receipt = await waitFor(
            landOwners[0].MockLandWithMint.transferQuad(
              landOwners[0].address,
              landOwners[1].address,
              1,
              18 + i,
              18 + j,
              bytes
            )
          );
          gasTotal = gasTotal.add(receipt.gasUsed);
        }
      }

      for (let i = 1; i < 6; i++) {
        const receipt = await waitFor(
          landOwners[0].MockLandWithMint.transferQuad(
            landOwners[0].address,
            landOwners[1].address,
            1,
            i,
            i,
            bytes
          )
        );
        gasTotal = gasTotal.add(receipt.gasUsed);
      }
      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(50);

      console.log('GAS USED ' + gasTotal.toString()); //receipt.gasUsed.toString());
    });

    it('testing transfering 100 lands', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      let gasTotal = BigNumber.from('0');

      for (let i = 1; i < 101; i++) {
        await waitFor(
          landOwners[0].MockLandWithMint.mintQuad(
            landOwners[0].address,
            1,
            i,
            i,
            bytes
          )
        );
      }

      for (let i = 1; i < 101; i++) {
        const receipt = await waitFor(
          landOwners[0].MockLandWithMint.transferQuad(
            landOwners[0].address,
            landOwners[1].address,
            1,
            i,
            i,
            bytes
          )
        );

        gasTotal = gasTotal.add(receipt.gasUsed);
      }
      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(100);
      console.log('GAS USED ' + gasTotal.toString()); //receipt.gasUsed.toString());
    });

    it('testing transfering 250 lands', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      let gasTotal = BigNumber.from('0');

      for (let i = 1; i < 251; i++) {
        await waitFor(
          landOwners[0].MockLandWithMint.mintQuad(
            landOwners[0].address,
            1,
            i,
            i,
            bytes
          )
        );
      }

      for (let i = 1; i < 251; i++) {
        const receipt = await waitFor(
          landOwners[0].MockLandWithMint.transferQuad(
            landOwners[0].address,
            landOwners[1].address,
            1,
            i,
            i,
            bytes
          )
        );

        gasTotal = gasTotal.add(receipt.gasUsed);
      }
      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(250);
      console.log('GAS USED ' + gasTotal.toString()); //receipt.gasUsed.toString());
    });

    it('testing transfering 576 lands', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      let gasTotal = BigNumber.from('0');

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          24,
          0,
          0,
          bytes
        )
      );

      for (let i = 0; i < 24; i++) {
        for (let j = 0; j < 24; j++) {
          const receipt = await waitFor(
            landOwners[0].MockLandWithMint.transferQuad(
              landOwners[0].address,
              landOwners[1].address,
              1,
              i,
              j,
              bytes
            )
          );
          gasTotal = gasTotal.add(receipt.gasUsed);
        }
      }

      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(576);
      console.log('GAS USED ' + gasTotal.toString()); //receipt.gasUsed.toString());
    });
  });

  describe('GasTest for batch transfer', function () {
    it('transfering 1 lands', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      let gasTotal = BigNumber.from('0');

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          1,
          1,
          1,
          bytes
        )
      );

      const receipt = await waitFor(
        landOwners[0].MockLandWithMint.transferQuad(
          landOwners[0].address,
          landOwners[1].address,
          1,
          1,
          1,
          bytes
        )
      );

      gasTotal = gasTotal.add(receipt.gasUsed);

      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(1);
      console.log('GAS USED for 1 transfer ' + gasTotal.toString()); //receipt.gasUsed.toString());
    });

    it('batch transfering 10 lands', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          1,
          1,
          1,
          bytes
        )
      );

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          3,
          3,
          3,
          bytes
        )
      );

      let gasTotal = BigNumber.from('0');

      const receipt = await waitFor(
        landOwners[0].MockLandWithMint.batchTransferQuad(
          landOwners[0].address,
          landOwners[1].address,
          [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          [1, 3, 3, 3, 4, 4, 4, 5, 5, 5],
          [1, 3, 4, 5, 3, 4, 5, 3, 4, 5],
          bytes
        )
      );

      gasTotal = gasTotal.add(receipt.gasUsed);
      console.log('GAS USED ' + gasTotal.toString()); //receipt.gasUsed.toString());
    });

    it('testing transfering 50 lands', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      for (let i = 1; i < 6; i++) {
        await waitFor(
          landOwners[0].MockLandWithMint.mintQuad(
            landOwners[0].address,
            1,
            i,
            i,
            bytes
          )
        );
      }

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          3,
          18,
          18,
          bytes
        )
      );

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          6,
          54,
          54,
          bytes
        )
      );
      const arraySize = [1, 1, 1, 1, 1];
      const arrayx = [1, 2, 3, 4, 5];
      const arrayy = [1, 2, 3, 4, 5];

      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          arraySize.push(1);
          arrayx.push(54 + i);
          arrayy.push(54 + j);
        }
      }

      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          arraySize.push(1);
          arrayx.push(18 + i);
          arrayy.push(18 + j);
        }
      }

      //const gasTotal = BigNumber.from('0');

      const receipt = await waitFor(
        landOwners[0].MockLandWithMint.batchTransferQuad(
          landOwners[0].address,
          landOwners[1].address,
          arraySize,
          arrayx,
          arrayy,
          bytes
        )
      );

      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(50);

      console.log('GAS USED ' + receipt.gasUsed.toString()); //receipt.gasUsed.toString());
    });

    it('batch transfering 50 lands not in quads', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      let gasTotal = BigNumber.from('0');

      for (let i = 1; i < 51; i++) {
        await waitFor(
          landOwners[0].MockLandWithMint.mintQuad(
            landOwners[0].address,
            1,
            i,
            i,
            bytes
          )
        );
      }

      const arraySize = [];
      const arrayx = [];
      const arrayy = [];

      for (let i = 1; i < 51; i++) {
        arraySize.push(1);
        arrayx.push(i);
        arrayy.push(i);
      }

      const receipt = await waitFor(
        landOwners[0].MockLandWithMint.batchTransferQuad(
          landOwners[0].address,
          landOwners[1].address,
          arraySize,
          arrayx,
          arrayy,
          bytes
        )
      );

      gasTotal = gasTotal.add(receipt.gasUsed);

      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(50);
      console.log('GAS USED ' + gasTotal.toString()); //receipt.gasUsed.toString());
    });

    it('batch transfering 100 lands', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      let gasTotal = BigNumber.from('0');

      for (let i = 1; i < 101; i++) {
        await waitFor(
          landOwners[0].MockLandWithMint.mintQuad(
            landOwners[0].address,
            1,
            i,
            i,
            bytes
          )
        );
      }

      const arraySize = [];
      const arrayx = [];
      const arrayy = [];

      for (let i = 1; i < 101; i++) {
        arraySize.push(1);
        arrayx.push(i);
        arrayy.push(i);
      }

      const receipt = await waitFor(
        landOwners[0].MockLandWithMint.batchTransferQuad(
          landOwners[0].address,
          landOwners[1].address,
          arraySize,
          arrayx,
          arrayy,
          bytes
        )
      );

      gasTotal = gasTotal.add(receipt.gasUsed);

      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(100);
      console.log('GAS USED ' + gasTotal.toString()); //receipt.gasUsed.toString());
    });

    it('batch transfering 250 lands', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      let gasTotal = BigNumber.from('0');

      for (let i = 1; i < 251; i++) {
        await waitFor(
          landOwners[0].MockLandWithMint.mintQuad(
            landOwners[0].address,
            1,
            i,
            i,
            bytes
          )
        );
      }

      const arraySize = [];
      const arrayx = [];
      const arrayy = [];

      for (let i = 1; i < 251; i++) {
        arraySize.push(1);
        arrayx.push(i);
        arrayy.push(i);
      }

      const receipt = await waitFor(
        landOwners[0].MockLandWithMint.batchTransferQuad(
          landOwners[0].address,
          landOwners[1].address,
          arraySize,
          arrayx,
          arrayy,
          bytes
        )
      );
      gasTotal = gasTotal.add(receipt.gasUsed);

      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(250);
      console.log('GAS USED for 250 ' + gasTotal.toString()); //receipt.gasUsed.toString());
    });

    it('batch transfering 500 lands', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      let gasTotal = BigNumber.from('0');

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          24,
          0,
          0,
          bytes
        )
      );

      const arraySize = [];
      const arrayx = [];
      const arrayy = [];

      for (let i = 0; i < 24; i++) {
        for (let j = 0; j < 24; j++) {
          arraySize.push(1);
          arrayx.push(i);
          arrayy.push(j);
        }
      }

      const receipt = await waitFor(
        landOwners[0].MockLandWithMint.batchTransferQuad(
          landOwners[0].address,
          landOwners[1].address,
          arraySize,
          arrayx,
          arrayy,
          bytes
        )
      );
      gasTotal = gasTotal.add(receipt.gasUsed);

      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(576);
      console.log('GAS USED 576 ' + gasTotal.toString()); //receipt.gasUsed.toString());
    });
  });
  describe('GasTest for tranfer quad', function () {
    it('batch transfer 576', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          12,
          0,
          0,
          bytes
        )
      );

      const receipt = await waitFor(
        landOwners[0].MockLandWithMint.transferQuad(
          landOwners[0].address,
          landOwners[1].address,
          12,
          0,
          0,
          bytes
        )
      );

      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(144);

      console.log('GAS USED for 144 ' + receipt.gasUsed); //receipt.gasUsed.toString());
    });

    it('batch transfer 2 576 land quads', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          24,
          0,
          0,
          bytes
        )
      );

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          24,
          48,
          48,
          bytes
        )
      );

      const receipt = await waitFor(
        landOwners[0].MockLandWithMint.batchTransferQuad(
          landOwners[0].address,
          landOwners[1].address,
          [24, 24],
          [0, 48],
          [0, 48],
          bytes
        )
      );

      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(1152);

      console.log('GAS USED for 2 576 ' + receipt.gasUsed); //receipt.gasUsed.toString());
    });

    it('batch transfer 3 576 land quads', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          24,
          0,
          0,
          bytes
        )
      );

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          24,
          48,
          48,
          bytes
        )
      );

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          24,
          72,
          72,
          bytes
        )
      );

      const receipt = await waitFor(
        landOwners[0].MockLandWithMint.batchTransferQuad(
          landOwners[0].address,
          landOwners[1].address,
          [24, 24, 24],
          [0, 48, 72],
          [0, 48, 72],
          bytes
        )
      );

      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(1728);

      console.log('GAS USED for 3 576 ' + receipt.gasUsed); //receipt.gasUsed.toString());
    });

    it('batch transfer 4 576 land quads', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          24,
          0,
          0,
          bytes
        )
      );

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          24,
          48,
          48,
          bytes
        )
      );

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          24,
          72,
          72,
          bytes
        )
      );

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          24,
          96,
          96,
          bytes
        )
      );

      const receipt = await waitFor(
        landOwners[0].MockLandWithMint.batchTransferQuad(
          landOwners[0].address,
          landOwners[1].address,
          [24, 24, 24, 24],
          [0, 48, 72, 96],
          [0, 48, 72, 96],
          bytes
        )
      );

      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(2304);

      console.log('GAS USED for 4 576 ' + receipt.gasUsed); //receipt.gasUsed.toString());
    });

    it('batch transfer 5 576 land quads', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          24,
          0,
          0,
          bytes
        )
      );

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          24,
          48,
          48,
          bytes
        )
      );

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          24,
          72,
          72,
          bytes
        )
      );

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          24,
          96,
          96,
          bytes
        )
      );

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          24,
          120,
          120,
          bytes
        )
      );

      const receipt = await waitFor(
        landOwners[0].MockLandWithMint.batchTransferQuad(
          landOwners[0].address,
          landOwners[1].address,
          [24, 24, 24, 24, 24],
          [0, 48, 72, 96, 120],
          [0, 48, 72, 96, 120],
          bytes
        )
      );

      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(2880);

      console.log('GAS USED for 576 ' + receipt.gasUsed); //receipt.gasUsed.toString());
    });
  });
});
