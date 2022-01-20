import {expect} from '../../chai-setup';
import {ethers, getUnnamedAccounts} from 'hardhat';
import {Contract} from 'ethers';
import {setupUsers, waitFor, withSnapshot} from '../../utils';
import {setupLand} from './fixtures';
import {sendMetaTx} from '../../sendMetaTx';

type User = {
  address: string;
  MockLandWithMint: Contract;
};

const setupTest = withSnapshot(
  ['MockLandWithMint'],
  async (): Promise<{
    MockLandWithMint: Contract;
    landOwners: User[];
  }> => {
    const MockLandWithMint = await ethers.getContract('MockLandWithMint');
    const unnamedAccounts = await getUnnamedAccounts();
    const landOwners = await setupUsers(unnamedAccounts, {MockLandWithMint});
    return {MockLandWithMint, landOwners};
  }
);

describe('MockLandWithMint.sol', function () {
  it('creation', async function () {
    const {MockLandWithMint} = await setupTest();
    expect(await MockLandWithMint.name()).to.be.equal("Sandbox's LANDs");
    expect(await MockLandWithMint.symbol()).to.be.equal('LAND');
  });
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
  describe('mint and check URIs', function () {
    for (const size of [1, 3, 6, 12, 24]) {
      it(`mint and check URI ${size}`, async function () {
        const GRID_SIZE = 408;
        const {landOwners} = await setupTest();
        const bytes = '0x3333';
        await waitFor(
          landOwners[0].MockLandWithMint.mintQuad(
            landOwners[0].address,
            size,
            size,
            size,
            bytes
          )
        );
        const tokenId = size + size * GRID_SIZE;
        expect(
          await landOwners[0].MockLandWithMint.tokenURI(tokenId)
        ).to.be.equal(
          `https://api.sandbox.game/lands/${tokenId}/metadata.json`
        );
      });
    }
  });
  it('supported interfaces', async function () {
    const {MockLandWithMint} = await setupTest();
    expect(await MockLandWithMint.supportsInterface('0x01ffc9a7')).to.be.true;
    expect(await MockLandWithMint.supportsInterface('0x80ac58cd')).to.be.true;
    expect(await MockLandWithMint.supportsInterface('0x5b5e139f')).to.be.true;
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
  describe('testing transferFrom', function () {
    it('Mint 1x1 and transfer it', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          1,
          0,
          0,
          bytes
        )
      );

      await waitFor(
        landOwners[0].MockLandWithMint.transferFrom(
          landOwners[0].address,
          landOwners[1].address,
          0
        )
      );
      const num1 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );
      expect(num1).to.equal(0);
      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(1);
    });
    it('Mint 12x12 and transfer 1x1 from it', async function () {
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

      await waitFor(
        landOwners[0].MockLandWithMint.transferFrom(
          landOwners[0].address,
          landOwners[1].address,
          0
        )
      );
      const num1 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );
      expect(num1).to.equal(143);
      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(1);
    });
  });

  describe('testing batchTransferFrom', function () {
    it('Mint 12x12 and transfer all internals 1x1s from it', async function () {
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

      await waitFor(
        landOwners[0].MockLandWithMint.batchTransferFrom(
          landOwners[0].address,
          landOwners[1].address,
          [
            0,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            419,
            418,
            417,
            416,
            415,
            414,
            413,
            412,
            411,
            410,
            409,
            408,
            816,
            817,
            818,
            819,
            820,
            821,
            822,
            823,
            824,
            825,
            826,
            827,
            1235,
            1234,
            1233,
            1232,
            1231,
            1230,
            1229,
            1228,
            1227,
            1226,
            1225,
            1224,
            1632,
            1633,
            1634,
            1635,
            1636,
            1637,
            1638,
            1639,
            1640,
            1641,
            1642,
            1643,
            2051,
            2050,
            2049,
            2048,
            2047,
            2046,
            2045,
            2044,
            2043,
            2042,
            2041,
            2040,
            2448,
            2449,
            2450,
            2451,
            2452,
            2453,
            2454,
            2455,
            2456,
            2457,
            2458,
            2459,
            2867,
            2866,
            2865,
            2864,
            2863,
            2862,
            2861,
            2860,
            2859,
            2858,
            2857,
            2856,
            3264,
            3265,
            3266,
            3267,
            3268,
            3269,
            3270,
            3271,
            3272,
            3273,
            3274,
            3275,
            3683,
            3682,
            3681,
            3680,
            3679,
            3678,
            3677,
            3676,
            3675,
            3674,
            3673,
            3672,
            4080,
            4081,
            4082,
            4083,
            4084,
            4085,
            4086,
            4087,
            4088,
            4089,
            4090,
            4091,
            4499,
            4498,
            4497,
            4496,
            4495,
            4494,
            4493,
            4492,
            4491,
            4490,
            4489,
            4488,
          ],
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

  describe('Meta transactions', function () {
    describe('transferFrom', function () {
      it('should transfer 1x1 quad', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnel,
          PolygonLand,
          MockPolygonLandTunnel,
          trustedForwarder,
        } = await setupLand();

        const landHolder = users[0];
        const landReceiver = users[1];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setPolygonLandTunnel(
          MockPolygonLandTunnel.address
        );
        expect(await PolygonLand.polygonLandTunnel()).to.equal(
          MockPolygonLandTunnel.address
        );
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        const {to, data} = await PolygonLand.populateTransaction[
          'transferQuad(address,address,uint256,uint256,uint256,bytes)'
        ](landHolder.address, landReceiver.address, size, x, y, bytes);

        await sendMetaTx(
          to,
          trustedForwarder,
          data,
          landHolder.address,
          '10000000'
        );

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landReceiver.address)).to.be.equal(
          plotCount
        );
      });
      it('should transfer 3x3 quad', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnel,
          PolygonLand,
          MockPolygonLandTunnel,
          trustedForwarder,
        } = await setupLand();

        const landHolder = users[0];
        const landReceiver = users[1];
        const size = 3;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setPolygonLandTunnel(
          MockPolygonLandTunnel.address
        );
        expect(await PolygonLand.polygonLandTunnel()).to.equal(
          MockPolygonLandTunnel.address
        );
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        const {to, data} = await PolygonLand.populateTransaction[
          'transferQuad(address,address,uint256,uint256,uint256,bytes)'
        ](landHolder.address, landReceiver.address, size, x, y, bytes);

        await sendMetaTx(
          to,
          trustedForwarder,
          data,
          landHolder.address,
          '10000000'
        );

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landReceiver.address)).to.be.equal(
          plotCount
        );
      });
      it('should transfer 6x6 quad', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnel,
          PolygonLand,
          MockPolygonLandTunnel,
          trustedForwarder,
        } = await setupLand();

        const landHolder = users[0];
        const landReceiver = users[1];
        const size = 6;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setPolygonLandTunnel(
          MockPolygonLandTunnel.address
        );
        expect(await PolygonLand.polygonLandTunnel()).to.equal(
          MockPolygonLandTunnel.address
        );
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        const {to, data} = await PolygonLand.populateTransaction[
          'transferQuad(address,address,uint256,uint256,uint256,bytes)'
        ](landHolder.address, landReceiver.address, size, x, y, bytes);

        await sendMetaTx(
          to,
          trustedForwarder,
          data,
          landHolder.address,
          '10000000'
        );

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landReceiver.address)).to.be.equal(
          plotCount
        );
      });
      it('should transfer 12x12 quad', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnel,
          PolygonLand,
          MockPolygonLandTunnel,
          trustedForwarder,
        } = await setupLand();

        const landHolder = users[0];
        const landReceiver = users[1];
        const size = 12;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setPolygonLandTunnel(
          MockPolygonLandTunnel.address
        );
        expect(await PolygonLand.polygonLandTunnel()).to.equal(
          MockPolygonLandTunnel.address
        );
        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          plotCount
        );

        const {to, data} = await PolygonLand.populateTransaction[
          'transferQuad(address,address,uint256,uint256,uint256,bytes)'
        ](landHolder.address, landReceiver.address, size, x, y, bytes);

        await sendMetaTx(
          to,
          trustedForwarder,
          data,
          landHolder.address,
          '10000000'
        );

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landReceiver.address)).to.be.equal(
          plotCount
        );
      });
    });
  });
});
