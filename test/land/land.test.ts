import {deployments, ethers} from 'hardhat';
import {expect} from '../chai-setup';
import {
  setupLand,
  setupLandV1,
  setupLandV2,
  getId,
  zeroAddress,
  setupOperatorFilter,
} from './fixtures';
const sizes = [1, 3, 6, 12, 24];
const GRID_SIZE = 408;

describe('LandV3', function () {
  describe('LandBaseTokenV2', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((size1) => {
      sizes.forEach((size2) => {
        if (size2 >= size1) return;
        it(`should NOT be able to transfer ${size2}x${size2} quad twice from ${size1}x${size1} quad`, async function () {
          const {
            landContract,
            getNamedAccounts,
            ethers,
            mintQuad,
          } = await setupLand();
          const {deployer, landAdmin} = await getNamedAccounts();
          const contract = landContract.connect(
            ethers.provider.getSigner(deployer)
          );
          await mintQuad(deployer, size1, 0, 0);
          await contract.transferQuad(deployer, landAdmin, size2, 0, 0, '0x');
          await expect(
            contract.transferQuad(deployer, landAdmin, size2, 0, 0, '0x')
          ).to.be.reverted;
        });
      });
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((size1) => {
      sizes.forEach((size2) => {
        if (size2 >= size1) return;
        it(`should return true for ${size2}x${size2} quad minited inside a ${size1}x${size1} quad`, async function () {
          const {
            landContract,
            getNamedAccounts,
            ethers,
            mintQuad,
          } = await setupLand();
          const {deployer} = await getNamedAccounts();
          const contract = landContract.connect(
            ethers.provider.getSigner(deployer)
          );
          // minting the quad of size1 *size1 at x size1 and y size1
          await mintQuad(deployer, size1, size1, size1);
          expect(await contract.exists(size1, size1, size1)).to.be.equal(true);
        });
      });
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((quadSize) => {
      it(`should return false for ${quadSize}x${quadSize} quad not minited`, async function () {
        const {landContract, getNamedAccounts, ethers} = await setupLand();
        const {deployer} = await getNamedAccounts();
        const contract = landContract.connect(
          ethers.provider.getSigner(deployer)
        );

        expect(await contract.exists(quadSize, quadSize, quadSize)).to.be.equal(
          false
        );
      });
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((quadSize) => {
      it(`should return true for ${quadSize}x${quadSize} quad  minited`, async function () {
        const {
          landContract,
          getNamedAccounts,
          ethers,
          mintQuad,
        } = await setupLand();
        const {deployer} = await getNamedAccounts();
        const contract = landContract.connect(
          ethers.provider.getSigner(deployer)
        );
        await mintQuad(deployer, quadSize, quadSize, quadSize);
        expect(await contract.exists(quadSize, quadSize, quadSize)).to.be.equal(
          true
        );
      });
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((quadSize) => {
      if (quadSize == 1) return;
      it(`should revert for invalid coordinates for size ${quadSize}`, async function () {
        const {landContract, getNamedAccounts, ethers} = await setupLand();
        const {deployer} = await getNamedAccounts();
        const contract = landContract.connect(
          ethers.provider.getSigner(deployer)
        );
        await expect(
          contract.exists(quadSize, quadSize + 1, quadSize + 1)
        ).to.be.revertedWith('Invalid coordinates');
      });
    });

    it(`should revert for invalid size`, async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {deployer} = await getNamedAccounts();
      const contract = landContract.connect(
        ethers.provider.getSigner(deployer)
      );
      await expect(contract.exists(5, 5, 5)).to.be.revertedWith('Invalid size');
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((size1) => {
      sizes.forEach((size2) => {
        if (size2 >= size1) return;
        it(`should NOT be able to transfer burned ${size2}x${size2} quad twice from ${size1}x${size1} quad`, async function () {
          const {
            landContract,
            getNamedAccounts,
            ethers,
            mintQuad,
          } = await setupLand();
          const {deployer, landAdmin} = await getNamedAccounts();
          const contract = landContract.connect(
            ethers.provider.getSigner(deployer)
          );
          await mintQuad(deployer, size1, 0, 0);
          for (let x = 0; x < size2; x++) {
            for (let y = 0; y < size2; y++) {
              const tokenId = x + y * GRID_SIZE;
              await contract.burn(tokenId);
            }
          }
          await expect(
            contract.transferQuad(deployer, landAdmin, size1, 0, 0, '0x')
          ).to.be.revertedWith('not owner');
        });
      });
    });

    it('Burnt land cannot be minted again', async function () {
      const {
        landContract,
        getNamedAccounts,
        ethers,
        mintQuad,
      } = await setupLand();
      const {deployer} = await getNamedAccounts();
      const contract = landContract.connect(
        ethers.provider.getSigner(deployer)
      );
      const x = 0;
      const y = 0;
      const tokenId = x + y * GRID_SIZE;

      await mintQuad(deployer, 3, x, y);

      await contract.burn(tokenId);

      await expect(mintQuad(deployer, 1, x, y)).to.be.revertedWith(
        'Already minted'
      );
    });

    it('should not be a minter by default', async function () {
      const {landContract, getNamedAccounts} = await setupLand();
      const {deployer} = await getNamedAccounts();

      expect(await landContract.isMinter(deployer)).to.be.false;
    });

    it('should be an admin to set minter', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {deployer} = await getNamedAccounts();
      const contract = landContract.connect(
        ethers.provider.getSigner(deployer)
      );

      await expect(contract.setMinter(deployer, true)).to.be.revertedWith(
        'only admin allowed'
      );

      expect(await landContract.isMinter(deployer)).to.be.false;
    });

    it('should enable a minter', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {deployer} = await getNamedAccounts();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      await expect(contract.setMinter(deployer, true)).not.to.be.reverted;

      expect(await landContract.isMinter(deployer)).to.be.true;
    });

    it('should disable a minter', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {deployer} = await getNamedAccounts();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      await expect(contract.setMinter(deployer, true)).not.to.be.reverted;
      await expect(contract.setMinter(deployer, false)).not.to.be.reverted;

      expect(await landContract.isMinter(deployer)).to.be.false;
    });

    it('should not accept address 0 as minter', async function () {
      const {landContract, ethers} = await setupLand();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      await expect(
        contract.setMinter(ethers.constants.AddressZero, false)
      ).to.be.revertedWith('address 0 is not allowed as minter');

      await expect(
        contract.setMinter(ethers.constants.AddressZero, true)
      ).to.be.revertedWith('address 0 is not allowed as minter');

      expect(await landContract.isMinter(ethers.constants.AddressZero)).to.be
        .false;
    });

    it('should only be able to disable an enabled minter', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {deployer} = await getNamedAccounts();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      await expect(contract.setMinter(deployer, true)).not.to.be.reverted;

      expect(await landContract.isMinter(deployer)).to.be.true;

      await expect(contract.setMinter(deployer, true)).to.be.revertedWith(
        'the status should be different than the current one'
      );
      await expect(contract.setMinter(deployer, false)).not.to.be.reverted;
    });

    it('should only be able to enable a disabled minter', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {deployer} = await getNamedAccounts();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      expect(await landContract.isMinter(deployer)).to.be.false;

      await expect(contract.setMinter(deployer, false)).to.be.revertedWith(
        'the status should be different than the current one'
      );
      await expect(contract.setMinter(deployer, true)).not.to.be.reverted;
    });

    it('should return the grid height', async function () {
      const {landContract} = await setupLand();
      const height = await landContract.height();
      expect(height).to.be.equal(408);
    });

    it('should return the grid width', async function () {
      const {landContract} = await setupLand();
      const width = await landContract.width();
      expect(width).to.be.equal(408);
    });

    it('should return quad coordinates', async function () {
      const {landContract, mintQuad, getNamedAccounts} = await setupLand();
      const {deployer} = await getNamedAccounts();
      const id = getId(4, 0, 0);
      await mintQuad(deployer, 12, 0, 0);
      const x = await landContract.getX(id);
      expect(x).to.be.equal(0);
      const y = await landContract.getY(id);
      expect(y).to.be.equal(0);
    });

    it('should revert when to address is zero', async function () {
      const {mintQuad} = await setupLand();
      await expect(mintQuad(zeroAddress, 3, 0, 0)).to.be.revertedWith(
        'to is zero address'
      );
    });

    it('should revert when size wrong', async function () {
      const {getNamedAccounts, mintQuad} = await setupLand();
      const {deployer} = await getNamedAccounts();
      await expect(mintQuad(deployer, 9, 0, 0)).to.be.revertedWith(
        'Invalid size'
      );
    });

    it('should revert when to coordinates are wrong', async function () {
      const {getNamedAccounts, mintQuad} = await setupLand();
      const {deployer} = await getNamedAccounts();
      await expect(mintQuad(deployer, 3, 5, 5)).to.be.revertedWith(
        'Invalid coordinates'
      );
    });

    it('should revert when quad is out of bounds (mintQuad)', async function () {
      const {getNamedAccounts, mintQuad} = await setupLand();
      const {deployer} = await getNamedAccounts();
      await expect(mintQuad(deployer, 3, 441, 441)).to.be.revertedWith(
        'Out of bounds'
      );
    });

    it('should revert when to signer is not minter', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {deployer} = await getNamedAccounts();
      await expect(
        landContract
          .connect(ethers.provider.getSigner(deployer))
          .mintQuad(deployer, 3, 0, 0, '0x')
      ).to.be.revertedWith('Only a minter can mint');
    });

    it('should revert when parent quad is already minted', async function () {
      const {getNamedAccounts, mintQuad} = await setupLand();
      const {deployer} = await getNamedAccounts();
      await mintQuad(deployer, 24, 0, 0);
      await expect(mintQuad(deployer, 3, 0, 0)).to.be.revertedWith(
        'Already minted'
      );
    });

    it('should revert when child quad is already minted', async function () {
      const {getNamedAccounts, mintQuad} = await setupLand();
      const {deployer} = await getNamedAccounts();
      await mintQuad(deployer, 3, 0, 0);
      await expect(mintQuad(deployer, 6, 0, 0)).to.be.revertedWith(
        'Already minted'
      );
    });

    it('should revert when  1x1 Land token is already minted', async function () {
      const {getNamedAccounts, mintQuad} = await setupLand();
      const {deployer} = await getNamedAccounts();
      await mintQuad(deployer, 1, 0, 0);
      await expect(mintQuad(deployer, 6, 0, 0)).to.be.revertedWith(
        'Already minted'
      );
    });

    it('should revert when from is zero address', async function () {
      const {
        landContract,
        getNamedAccounts,
        ethers,
        mintQuad,
      } = await setupLand();
      const {deployer, landAdmin} = await getNamedAccounts();
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landContract
          .connect(ethers.provider.getSigner(deployer))
          .batchTransferQuad(zeroAddress, landAdmin, [6], [0], [0], '0x')
      ).to.be.revertedWith('from is zero address');
    });

    it('should revert when sizes, x, y are not of same length', async function () {
      const {
        landContract,
        getNamedAccounts,
        ethers,
        mintQuad,
      } = await setupLand();
      const {deployer, landAdmin} = await getNamedAccounts();
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landContract
          .connect(ethers.provider.getSigner(deployer))
          .batchTransferQuad(deployer, landAdmin, [6], [0, 6], [0, 6], '0x')
      ).to.be.revertedWith('invalid data');
    });

    it('should revert when to is a contract and not a ERC721 receiver', async function () {
      const {
        landContract,
        getNamedAccounts,
        ethers,
        mintQuad,
        TestERC1155ERC721TokenReceiver,
      } = await setupLand();
      const {deployer} = await getNamedAccounts();
      await TestERC1155ERC721TokenReceiver.connect(
        await ethers.getSigner(deployer)
      ).returnWrongBytes();

      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landContract
          .connect(ethers.provider.getSigner(deployer))
          .batchTransferQuad(
            deployer,
            TestERC1155ERC721TokenReceiver.address,
            [6],
            [0],
            [0],
            '0x'
          )
      ).to.be.revertedWith('erc721 batch transfer rejected by to');
    });

    it('should revert when to is zero address', async function () {
      const {
        landContract,
        getNamedAccounts,
        ethers,
        mintQuad,
      } = await setupLand();
      const {deployer} = await getNamedAccounts();
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landContract
          .connect(ethers.provider.getSigner(deployer))
          .batchTransferQuad(deployer, zeroAddress, [6], [0], [0], '0x')
      ).to.be.revertedWith("can't send to zero address");
    });

    it('should revert when size array and coordinates array are of different length', async function () {
      const {
        landContract,
        getNamedAccounts,
        ethers,
        mintQuad,
      } = await setupLand();
      const {deployer} = await getNamedAccounts();
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landContract
          .connect(ethers.provider.getSigner(deployer))
          .batchTransferQuad(deployer, zeroAddress, [6, 3], [0], [0], '0x')
      ).to.be.revertedWith("can't send to zero address");
    });

    it('should revert when signer is not approved', async function () {
      const {
        landContract,
        getNamedAccounts,
        ethers,
        mintQuad,
      } = await setupLand();
      const {deployer, landAdmin} = await getNamedAccounts();
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landContract
          .connect(ethers.provider.getSigner(landAdmin))
          .batchTransferQuad(deployer, landAdmin, [6], [0], [0], '0x')
      ).to.be.revertedWith('not authorized to transferMultiQuads');
    });

    it('should revert if signer is not approved', async function () {
      const {
        landContract,
        getNamedAccounts,
        ethers,
        mintQuad,
      } = await setupLand();
      const {deployer, landAdmin} = await getNamedAccounts();
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landContract
          .connect(ethers.provider.getSigner(landAdmin))
          .transferQuad(deployer, landAdmin, 6, 0, 0, '0x')
      ).to.be.revertedWith('not authorized to transferQuad');
    });

    it('should revert for invalid coordinates', async function () {
      const {
        landContract,
        getNamedAccounts,
        ethers,
        mintQuad,
      } = await setupLand();
      const {deployer, landAdmin} = await getNamedAccounts();
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landContract
          .connect(ethers.provider.getSigner(deployer))
          .transferQuad(deployer, landAdmin, 6, 1, 1, '0x')
      ).to.be.revertedWith('Invalid coordinates');
    });

    it('should revert when quad is out of bounds (transferQuad)', async function () {
      const {
        landContract,
        getNamedAccounts,
        ethers,
        mintQuad,
      } = await setupLand();
      const {deployer, landAdmin} = await getNamedAccounts();
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landContract
          .connect(ethers.provider.getSigner(deployer))
          .transferQuad(deployer, landAdmin, 3, 441, 441, '0x')
      ).to.be.revertedWith('Out of bounds');
    });

    it('should revert for invalid size', async function () {
      const {
        landContract,
        getNamedAccounts,
        ethers,
        mintQuad,
      } = await setupLand();
      const {deployer, landAdmin} = await getNamedAccounts();
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landContract
          .connect(ethers.provider.getSigner(deployer))
          .transferQuad(deployer, landAdmin, 9, 0, 0, '0x')
      ).to.be.revertedWith('Invalid size');
    });

    it('should revert when to is zeroAddress', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {landAdmin} = await getNamedAccounts();
      await expect(
        landContract
          .connect(ethers.provider.getSigner(landAdmin))
          .mintAndTransferQuad(zeroAddress, 3, 0, 0, '0x')
      ).to.be.revertedWith('to is zero address');
    });

    it('should revert when to is non ERC721 receiving contract', async function () {
      const {
        landContract,
        getNamedAccounts,
        ethers,
        TestERC1155ERC721TokenReceiver,
        mintQuad,
      } = await setupLand();
      const {deployer, landAdmin} = await getNamedAccounts();
      await TestERC1155ERC721TokenReceiver.connect(
        await ethers.getSigner(deployer)
      ).returnWrongBytes();
      await mintQuad(landAdmin, 3, 0, 0);
      await expect(
        landContract
          .connect(ethers.provider.getSigner(landAdmin))
          .mintAndTransferQuad(
            TestERC1155ERC721TokenReceiver.address,
            6,
            0,
            0,
            '0x'
          )
      ).to.be.revertedWith('erc721 batch transfer rejected by to');
    });

    it('should not revert when to is ERC721 receiving contract', async function () {
      const {
        landContract,
        getNamedAccounts,
        ethers,
        TestERC1155ERC721TokenReceiver,
        mintQuad,
      } = await setupLand();
      const {landAdmin} = await getNamedAccounts();
      await mintQuad(landAdmin, 3, 0, 0);
      await landContract
        .connect(ethers.provider.getSigner(landAdmin))
        .mintAndTransferQuad(
          TestERC1155ERC721TokenReceiver.address,
          6,
          0,
          0,
          '0x'
        );
      const id = getId(3, 0, 0);
      expect(await landContract.ownerOf(id)).to.be.equal(
        TestERC1155ERC721TokenReceiver.address
      );
    });

    it('should revert when to is zeroAddress (transferQuad)', async function () {
      const {
        landContract,
        getNamedAccounts,
        ethers,
        mintQuad,
      } = await setupLand();
      const {landAdmin} = await getNamedAccounts();
      await mintQuad(landAdmin, 3, 0, 0);
      await expect(
        landContract
          .connect(ethers.provider.getSigner(landAdmin))
          .transferQuad(landAdmin, zeroAddress, 3, 0, 0, '0x')
      ).to.be.revertedWith("can't send to zero address");
    });

    it('should revert when from is zeroAddress (transferQuad)', async function () {
      const {
        landContract,
        getNamedAccounts,
        ethers,
        mintQuad,
      } = await setupLand();
      const {landAdmin} = await getNamedAccounts();
      await mintQuad(landAdmin, 3, 0, 0);
      await expect(
        landContract
          .connect(ethers.provider.getSigner(landAdmin))
          .transferQuad(zeroAddress, landAdmin, 3, 0, 0, '0x')
      ).to.be.revertedWith('from is zero address');
    });

    it('should revert when operator is not approved (transferQuad)', async function () {
      const {
        landContract,
        getNamedAccounts,
        ethers,
        mintQuad,
      } = await setupLand();
      const {landAdmin, deployer} = await getNamedAccounts();
      await mintQuad(landAdmin, 3, 0, 0);
      await expect(
        landContract
          .connect(ethers.provider.getSigner(deployer))
          .transferQuad(landAdmin, deployer, 3, 0, 0, '0x')
      ).to.be.revertedWith('not authorized to transferQuad');
    });

    it('should revert when from is not owner of land (transferQuad)', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {deployer, landAdmin} = await getNamedAccounts();
      await expect(
        landContract
          .connect(ethers.provider.getSigner(landAdmin))
          .transferQuad(landAdmin, deployer, 1, 0, 0, '0x')
      ).to.be.revertedWith('token does not exist');
    });

    it('should revert when from is not owner of Quad (transferQuad)', async function () {
      const {
        landContract,
        getNamedAccounts,
        ethers,
        mintQuad,
      } = await setupLand();
      const {deployer, landAdmin} = await getNamedAccounts();
      await mintQuad(deployer, 3, 0, 0);
      await expect(
        landContract
          .connect(ethers.provider.getSigner(landAdmin))
          .transferQuad(landAdmin, deployer, 6, 0, 0, '0x')
      ).to.be.revertedWith('not owner of child Quad');
    });

    it('should not revert when from is owner of all subQuads of Quad (transferQuad)', async function () {
      const {
        landContract,
        getNamedAccounts,
        ethers,
        mintQuad,
      } = await setupLand();
      const {deployer, landAdmin} = await getNamedAccounts();
      await mintQuad(deployer, 3, 0, 0);
      await mintQuad(deployer, 3, 0, 3);
      await mintQuad(deployer, 3, 3, 0);
      await mintQuad(deployer, 3, 3, 3);

      await landContract
        .connect(ethers.provider.getSigner(deployer))
        .transferQuad(deployer, landAdmin, 6, 0, 0, '0x');
      const id = getId(3, 0, 0);
      expect(await landContract.ownerOf(id)).to.be.equal(landAdmin);
    });

    it('should revert when size is invalid (transferQuad)', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {deployer, landAdmin} = await getNamedAccounts();
      await expect(
        landContract
          .connect(ethers.provider.getSigner(landAdmin))
          .transferQuad(landAdmin, deployer, 4, 0, 0, '0x')
      ).to.be.revertedWith('Invalid size');
    });

    it('should return the name of the token contract', async function () {
      const {landContract} = await setupLand();

      expect(await landContract.name()).to.be.equal("Sandbox's LANDs");
    });

    it('should return the symbol of the token contract', async function () {
      const {landContract} = await setupLand();

      expect(await landContract.symbol()).to.be.equal('LAND');
    });

    it('should return correct tokenUri for quad', async function () {
      const {landContract, getNamedAccounts, mintQuad} = await setupLand();
      const {deployer} = await getNamedAccounts();
      await mintQuad(deployer, 6, 0, 0);
      const id = getId(3, 0, 0);
      expect(await landContract.tokenURI(id)).to.equal(
        'https://api.sandbox.game/lands/904625697166532776746648320380374280103671755200316906558262375061821325312/metadata.json'
      );
    });

    it('should revert when id is not minted', async function () {
      const {landContract} = await setupLand();
      const id = getId(3, 0, 0);
      await expect(landContract.tokenURI(id)).to.be.revertedWith(
        'LandV3: Id does not exist'
      );
    });

    it('should return tokenUri for tokenId zero', async function () {
      const {
        landContract,
        getNamedAccounts,

        mintQuad,
      } = await setupLand();
      const {deployer} = await getNamedAccounts();
      await mintQuad(deployer, 1, 0, 0);
      const id = getId(1, 0, 0);
      expect(await landContract.tokenURI(id)).to.equal(
        'https://api.sandbox.game/lands/0/metadata.json'
      );
    });

    it('it should revert approveFor for unathorized sender', async function () {
      const {
        mockMarketPlace3,
        landV3,
        users,
        deployer,
      } = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);
      await expect(
        users[0].landV3.approveFor(deployer, mockMarketPlace3.address, id)
      ).to.be.revertedWith('LandV3: not authorized to approve');
    });

    it('it should revert for setApprovalForAllFor of zero address', async function () {
      const {mockMarketPlace3, users} = await setupOperatorFilter();
      await expect(
        users[0].landV3.setApprovalForAllFor(
          zeroAddress,
          mockMarketPlace3.address,
          true
        )
      ).to.be.revertedWith('LandV3: Invalid sender address');
    });

    it('should revert approveFor of operator is zeroAddress', async function () {
      const {mockMarketPlace3, landV3, users} = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);
      await expect(
        users[0].landV3.approveFor(zeroAddress, mockMarketPlace3.address, id)
      ).to.be.revertedWith('LandV3: sender is zero address');
    });

    it('it should revert setApprovalForAllFor for unauthorized sender', async function () {
      const {mockMarketPlace3, users, deployer} = await setupOperatorFilter();
      await expect(
        users[0].landV3.setApprovalForAllFor(
          deployer,
          mockMarketPlace3.address,
          true
        )
      ).to.be.revertedWith('LandV3: not authorized to approve for all');
    });

    it('it should revert Approval for invalid token', async function () {
      const {users, deployer} = await setupOperatorFilter();
      const {landV3} = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id = getId(3, 0, 0);
      await expect(users[0].landV3.approve(deployer, id)).to.be.revertedWith(
        'LandV3: token does not exist'
      );
    });

    it('should revert approveFor for unauthorized sender', async function () {
      const {
        mockMarketPlace3,
        landV3,
        users,
        deployer,
      } = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);
      await expect(
        users[0].landV3.approveFor(deployer, mockMarketPlace3.address, id)
      ).to.be.revertedWith('LandV3: not authorized to approve');
    });

    it('should revert for transfer when to is zeroAddress(mintAndTransferQuad)', async function () {
      const {
        landContract,
        getNamedAccounts,
        ethers,
        mintQuad,
      } = await setupLand();
      const {landAdmin} = await getNamedAccounts();
      await mintQuad(landAdmin, 6, 0, 0);

      await expect(
        landContract
          .connect(ethers.provider.getSigner(landAdmin))
          .mintAndTransferQuad(zeroAddress, 3, 0, 0, '0x')
      ).to.be.revertedWith('to is zero address');
    });

    it('should revert when signer is not a minter', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {deployer} = await getNamedAccounts();
      await expect(
        landContract
          .connect(ethers.provider.getSigner(deployer))
          .mintAndTransferQuad(deployer, 3, 0, 0, '0x')
      ).to.be.revertedWith('Only a minter can mint');
    });

    it('should revert when coordinates are wrong', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {deployer, landAdmin} = await getNamedAccounts();
      await expect(
        landContract
          .connect(ethers.provider.getSigner(landAdmin))
          .mintAndTransferQuad(deployer, 3, 5, 5, '0x')
      ).to.be.revertedWith('Invalid coordinates');
    });

    it('should revert when quad is out of bounds (mintAndTransferQuad)', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {deployer, landAdmin} = await getNamedAccounts();
      await expect(
        landContract
          .connect(ethers.provider.getSigner(landAdmin))
          .mintAndTransferQuad(deployer, 3, 441, 441, '0x')
      ).to.be.revertedWith('Out of bounds');
    });
  });

  // eslint-disable-next-line mocha/no-setup-in-describe
  sizes.forEach((quadSize) => {
    it(`should mint ${quadSize}x${quadSize} quad `, async function () {
      const {
        landContract,
        getNamedAccounts,
        ethers,
        mintQuad,
      } = await setupLand();
      const {deployer} = await getNamedAccounts();
      const contract = landContract.connect(
        ethers.provider.getSigner(deployer)
      );
      await mintQuad(deployer, quadSize, quadSize, quadSize);
      expect(await contract.exists(quadSize, quadSize, quadSize)).to.be.equal(
        true
      );
    });
  });

  // eslint-disable-next-line mocha/no-setup-in-describe
  sizes.forEach((size1) => {
    sizes.forEach((size2) => {
      if (size2 >= size1) return;
      it(`should NOT be able to mint child ${size1}x${size1} quad if parent ${size2}x${size2} quad is already minted`, async function () {
        const {getNamedAccounts, mintQuad} = await setupLand();
        const {deployer} = await getNamedAccounts();

        await mintQuad(deployer, size1, 0, 0);

        await expect(mintQuad(deployer, size2, 0, 0)).to.be.revertedWith(
          'Already minted'
        );
      });
    });
  });

  // eslint-disable-next-line mocha/no-setup-in-describe
  sizes.forEach((size1) => {
    sizes.forEach((size2) => {
      if (size2 >= size1) return;
      it(`should NOT be able to mint parent ${size1}x${size1} quad if child ${size2}x${size2} quad is already minted`, async function () {
        const {getNamedAccounts, mintQuad} = await setupLand();
        const {deployer} = await getNamedAccounts();

        await mintQuad(deployer, size2, 0, 0);

        await expect(mintQuad(deployer, size1, 0, 0)).to.be.revertedWith(
          'Already minted'
        );
      });
    });
  });

  // eslint-disable-next-line mocha/no-setup-in-describe
  sizes.forEach((quadSize) => {
    it(`should return correct ownerOf ${quadSize}x${quadSize} quad minted`, async function () {
      const {
        landContract,
        getNamedAccounts,
        ethers,
        mintQuad,
      } = await setupLand();
      const {deployer} = await getNamedAccounts();
      const contract = landContract.connect(
        ethers.provider.getSigner(deployer)
      );

      await mintQuad(deployer, quadSize, quadSize, quadSize);
      let layer;
      if (quadSize == 1) {
        layer = 1;
      } else if (quadSize == 3) {
        layer = 2;
      } else if (quadSize == 6) {
        layer = 3;
      } else if (quadSize == 12) {
        layer = 4;
      } else {
        layer = 5;
      }

      expect(
        await contract.ownerOf(getId(layer, quadSize, quadSize))
      ).to.be.equal(deployer);
    });
  });

  it('should revert for incorrect id (wrong size)', async function () {
    const {landContract} = await setupLand();

    await expect(landContract.ownerOf(getId(9, 0, 0))).to.be.revertedWith(
      'Invalid token id'
    );
  });

  // eslint-disable-next-line mocha/no-setup-in-describe
  sizes.forEach((size1) => {
    sizes.forEach((size2) => {
      if (size2 >= size1) return;
      it(`should NOT be able to mint and transfer  ${size1}x${size1} quad if signer is not the owner of child ${size2}x${size2} quad`, async function () {
        const {
          landContract,
          getNamedAccounts,
          ethers,
          mintQuad,
        } = await setupLand();
        const {deployer, landAdmin} = await getNamedAccounts();

        await mintQuad(deployer, size2, 0, 0);

        await expect(
          landContract
            .connect(ethers.provider.getSigner(landAdmin))
            .mintAndTransferQuad(landAdmin, size1, 0, 0, '0x')
        ).to.be.revertedWith('Already minted');
      });
    });
  });

  // eslint-disable-next-line mocha/no-setup-in-describe
  sizes.forEach((size1) => {
    sizes.forEach((size2) => {
      if (size2 <= size1) return;
      it(`should NOT be able to transfer  ${size1}x${size1} quad if signer is not the owner of parent ${size2}x${size2} quad`, async function () {
        const {
          landContract,
          getNamedAccounts,
          ethers,
          mintQuad,
        } = await setupLand();
        const {deployer, landAdmin} = await getNamedAccounts();

        await mintQuad(deployer, size2, 0, 0);

        await expect(
          landContract
            .connect(ethers.provider.getSigner(landAdmin))
            .mintAndTransferQuad(landAdmin, size1, 0, 0, '0x')
        ).to.be.reverted;
      });
    });
  });

  describe('MetaTransactionReceiverV2', function () {
    it('should not be a meta transaction processor', async function () {
      const {landContract, sandContract} = await setupLand();

      expect(
        await landContract.isMetaTransactionProcessor(sandContract.address)
      ).to.be.false;
    });

    it('should enable a meta transaction processor', async function () {
      const {
        landContract,
        sandContract,
        getNamedAccounts,
        ethers,
      } = await setupLand();
      const {landAdmin} = await getNamedAccounts();
      const contract = landContract.connect(
        ethers.provider.getSigner(landAdmin)
      );

      await expect(
        contract.setMetaTransactionProcessor(sandContract.address, true)
      ).not.to.be.reverted;

      expect(
        await landContract.isMetaTransactionProcessor(sandContract.address)
      ).to.be.true;
    });

    it('should disable a meta transaction processor', async function () {
      const {
        landContract,
        sandContract,
        getNamedAccounts,
        ethers,
      } = await setupLand();
      const {landAdmin} = await getNamedAccounts();
      const contract = landContract.connect(
        ethers.provider.getSigner(landAdmin)
      );

      await expect(
        contract.setMetaTransactionProcessor(sandContract.address, false)
      ).not.to.be.reverted;

      expect(
        await landContract.isMetaTransactionProcessor(sandContract.address)
      ).to.be.false;
    });

    it('should only be a contract as meta transaction processor', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {landAdmin} = await getNamedAccounts();
      const contract = landContract.connect(
        ethers.provider.getSigner(landAdmin)
      );

      await expect(
        contract.setMetaTransactionProcessor(landAdmin, true)
      ).to.be.revertedWith('only contracts can be meta transaction processor');
    });

    it('should only be the admin able to set a meta transaction processor', async function () {
      const {
        landContract,
        sandContract,
        getNamedAccounts,
        ethers,
      } = await setupLand();
      const {deployer} = await getNamedAccounts();
      const contract = landContract.connect(
        ethers.provider.getSigner(deployer)
      );
      const admin = await landContract.getAdmin();
      const contractAsAdmin = landContract.connect(
        ethers.provider.getSigner(admin)
      );

      await expect(
        contract.setMetaTransactionProcessor(sandContract.address, true)
      ).to.be.revertedWith('only admin allowed');

      await expect(
        contractAsAdmin.setMetaTransactionProcessor(sandContract.address, true)
      ).not.to.be.reverted;
    });
  });

  describe('AdminV2', function () {
    it('should get the current admin', async function () {
      const {landContract, getNamedAccounts} = await setupLand();
      const {landAdmin} = await getNamedAccounts();

      expect(await landContract.getAdmin()).to.be.equal(landAdmin);
    });

    it('should change the admin to a new address', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {deployer} = await getNamedAccounts();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      await expect(contract.changeAdmin(deployer)).not.to.be.reverted;

      expect(await contract.getAdmin()).to.be.equal(deployer);
    });

    it('should only be changed to a new admin', async function () {
      const {landContract, ethers} = await setupLand();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      await expect(contract.changeAdmin(admin)).to.be.reverted;
    });
  });

  describe('SuperOperatorsV2', function () {
    it('should not be a super operator by default', async function () {
      const {landContract, getNamedAccounts} = await setupLand();
      const {landAdmin} = await getNamedAccounts();

      expect(await landContract.isSuperOperator(landAdmin)).to.be.false;
    });

    it('should be an admin to set super operator', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {deployer} = await getNamedAccounts();
      const contract = landContract.connect(
        ethers.provider.getSigner(deployer)
      );

      await expect(
        contract.setSuperOperator(deployer, true)
      ).to.be.revertedWith('only admin allowed');

      expect(await landContract.isSuperOperator(deployer)).to.be.false;
    });

    it('should enable a super operator', async function () {
      const {landContract, ethers} = await setupLand();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      await expect(contract.setSuperOperator(admin, true)).not.to.be.reverted;

      expect(await landContract.isSuperOperator(admin)).to.be.true;
    });

    it('should disable a super operator', async function () {
      const {landContract, ethers} = await setupLand();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      await expect(contract.setSuperOperator(admin, true)).not.to.be.reverted;
      await expect(contract.setSuperOperator(admin, false)).not.to.be.reverted;

      expect(await landContract.isSuperOperator(admin)).to.be.false;
    });

    it('should not accept address 0 as super operator', async function () {
      const {landContract, ethers} = await setupLand();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      await expect(
        contract.setSuperOperator(ethers.constants.AddressZero, false)
      ).to.be.revertedWith('address 0 is not allowed as super operator');

      await expect(
        contract.setSuperOperator(ethers.constants.AddressZero, true)
      ).to.be.revertedWith('address 0 is not allowed as super operator');

      expect(await landContract.isSuperOperator(ethers.constants.AddressZero))
        .to.be.false;
    });

    it('should only be able to disable an enabled super operator', async function () {
      const {landContract, ethers} = await setupLand();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      await expect(contract.setSuperOperator(admin, true)).not.to.be.reverted;

      expect(await landContract.isSuperOperator(admin)).to.be.true;

      await expect(contract.setSuperOperator(admin, true)).to.be.revertedWith(
        'the status should be different than the current one'
      );
      await expect(contract.setSuperOperator(admin, false)).not.to.be.reverted;
    });

    it('should only be able to enable a disabled super operator', async function () {
      const {landContract, ethers} = await setupLand();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      expect(await landContract.isSuperOperator(admin)).to.be.false;

      await expect(contract.setSuperOperator(admin, false)).to.be.revertedWith(
        'the status should be different than the current one'
      );
      await expect(contract.setSuperOperator(admin, true)).not.to.be.reverted;
    });
  });

  describe('UpgradeV2', function () {
    it('should upgrade to V2 and keep storage intact', async function () {
      const {landContract, getNamedAccounts, mintQuad} = await setupLandV1();
      const {landAdmin, deployer, upgradeAdmin} = await getNamedAccounts();
      const {deploy} = deployments;

      await mintQuad(landAdmin, 24, 0, 0);

      expect(await landContract.balanceOf(landAdmin)).to.be.equal(576);
      expect(await landContract.isMinter(landAdmin)).to.be.true;
      expect(await landContract.getAdmin()).to.be.equal(landAdmin);
      expect(await landContract.ownerOf(0)).to.be.equal(landAdmin);

      await deploy('Land', {
        from: deployer,
        contract: 'LandV2',
        proxy: {
          owner: upgradeAdmin,
          proxyContract: 'OpenZeppelinTransparentProxy',
          upgradeIndex: 1,
        },
        log: true,
      });

      const landV2Contract = await ethers.getContract('Land');

      expect(await landV2Contract.balanceOf(landAdmin)).to.be.equal(576);
      expect(await landV2Contract.isMinter(landAdmin)).to.be.true;
      expect(await landV2Contract.getAdmin()).to.be.equal(landAdmin);
      expect(await landV2Contract.ownerOf(0)).to.be.equal(landAdmin);

      const contract = landV2Contract.connect(
        ethers.provider.getSigner(landAdmin)
      );

      await expect(contract.setMinter(ethers.constants.AddressZero, true)).to.be
        .reverted;

      await mintQuad(landAdmin, 24, 24, 0);

      expect(await landV2Contract.balanceOf(landAdmin)).to.be.equal(576 * 2);
    });
  });

  describe('UpgradeV3', function () {
    it('should upgrade to V3 and keep storage intact', async function () {
      const {landContract, getNamedAccounts, mintQuad} = await setupLandV2();
      const {landAdmin, deployer, upgradeAdmin} = await getNamedAccounts();
      const {deploy} = deployments;

      await mintQuad(landAdmin, 24, 0, 0);

      expect(await landContract.balanceOf(landAdmin)).to.be.equal(576);
      expect(await landContract.isMinter(landAdmin)).to.be.true;
      expect(await landContract.getAdmin()).to.be.equal(landAdmin);
      expect(await landContract.ownerOf(0)).to.be.equal(landAdmin);

      await deploy('Land', {
        from: deployer,
        contract: 'LandV3',
        proxy: {
          owner: upgradeAdmin,
          proxyContract: 'OpenZeppelinTransparentProxy',
          upgradeIndex: 2,
        },
        log: true,
      });

      const landV3Contract = await ethers.getContract('Land');

      expect(await landV3Contract.balanceOf(landAdmin)).to.be.equal(576);
      expect(await landV3Contract.isMinter(landAdmin)).to.be.true;
      expect(await landV3Contract.getAdmin()).to.be.equal(landAdmin);
      expect(await landV3Contract.ownerOf(0)).to.be.equal(landAdmin);

      const contract = landV3Contract.connect(
        ethers.provider.getSigner(landAdmin)
      );

      await expect(contract.setMinter(ethers.constants.AddressZero, true)).to.be
        .reverted;

      await mintQuad(landAdmin, 24, 24, 0);

      expect(await landV3Contract.balanceOf(landAdmin)).to.be.equal(576 * 2);
    });
  });

  describe('OperatorFilterer', function () {
    it('should be registered', async function () {
      const {operatorFilterRegistry, landV3} = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.isRegistered(landV3.address)
      ).to.be.equal(true);
    });

    it('would not register on the operator filter registry if not set on the Land', async function () {
      const {
        operatorFilterRegistry,
        LandV3WithRegistryNotSet,
      } = await setupOperatorFilter();
      await LandV3WithRegistryNotSet.registerFilterer(zeroAddress, false);

      expect(
        await operatorFilterRegistry.isRegistered(
          LandV3WithRegistryNotSet.address
        )
      ).to.be.equal(false);
    });

    it('would not subscribe to operatorFilterSubscription if Land is already registered', async function () {
      const {
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        LandV3WithRegistryNotSet,
      } = await setupOperatorFilter();
      await LandV3WithRegistryNotSet.setOperatorRegistry(
        operatorFilterRegistryAsOwner.address
      );
      await LandV3WithRegistryNotSet.registerFilterer(zeroAddress, false);
      await LandV3WithRegistryNotSet.registerFilterer(
        operatorFilterSubscription.address,
        true
      );

      expect(
        await operatorFilterRegistryAsOwner.subscriptionOf(
          LandV3WithRegistryNotSet.address
        )
      ).to.be.equal(zeroAddress);
    });

    it('should be registered through OperatorFiltererUpgradeable', async function () {
      const {
        operatorFilterRegistry,
        LandV3WithRegistryNotSet,
      } = await setupOperatorFilter();

      await LandV3WithRegistryNotSet.setOperatorRegistry(
        operatorFilterRegistry.address
      );
      await LandV3WithRegistryNotSet.registerFilterer(zeroAddress, false);

      expect(
        await operatorFilterRegistry.isRegistered(
          LandV3WithRegistryNotSet.address
        )
      ).to.be.equal(true);
    });

    it('should could be registered and copy subscription through OperatorFiltererUpgradeable', async function () {
      const {
        operatorFilterRegistry,
        LandV3WithRegistryNotSet,
        operatorFilterSubscription,
        mockMarketPlace1,
      } = await setupOperatorFilter();

      await LandV3WithRegistryNotSet.setOperatorRegistry(
        operatorFilterRegistry.address
      );
      await LandV3WithRegistryNotSet.registerFilterer(
        operatorFilterSubscription.address,
        false
      );

      expect(
        await operatorFilterRegistry.isRegistered(
          LandV3WithRegistryNotSet.address
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.subscriptionOf(
          LandV3WithRegistryNotSet.address
        )
      ).to.be.equal(zeroAddress);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          LandV3WithRegistryNotSet.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
    });

    it('Black listed market places can be approved if operator filterer registry is not set on Land', async function () {
      const {
        LandV3WithRegistryNotSet,
        users,
        operatorFilterSubscription,
        mockMarketPlace1,
      } = await setupOperatorFilter();

      await LandV3WithRegistryNotSet.mintQuadWithOutMinterCheck(
        users[0].address,
        1,
        0,
        0,
        '0x'
      );
      await LandV3WithRegistryNotSet.registerFilterer(
        operatorFilterSubscription.address,
        true
      );

      await users[0].LandV3WithRegistryNotSet.setApprovalForAll(
        mockMarketPlace1.address,
        true
      );

      expect(
        await LandV3WithRegistryNotSet.isApprovedForAll(
          users[0].address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
    });

    it('Black listed market places can transfer token if operator filterer registry is not set on Land', async function () {
      const {
        LandV3WithRegistryNotSet,
        users,
        operatorFilterSubscription,
        mockMarketPlace1,
      } = await setupOperatorFilter();

      await LandV3WithRegistryNotSet.mintQuadWithOutMinterCheck(
        users[0].address,
        1,
        0,
        0,
        '0x'
      );
      const id = getId(1, 0, 0);
      await LandV3WithRegistryNotSet.registerFilterer(
        operatorFilterSubscription.address,
        true
      );

      await users[0].LandV3WithRegistryNotSet.setApprovalForAll(
        mockMarketPlace1.address,
        true
      );

      expect(
        await LandV3WithRegistryNotSet.isApprovedForAll(
          users[0].address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);

      await mockMarketPlace1['transferLand(address,address,address,uint256)'](
        LandV3WithRegistryNotSet.address,
        users[0].address,
        users[1].address,
        id
      );

      expect(await LandV3WithRegistryNotSet.ownerOf(id)).to.be.equal(
        users[1].address
      );
    });

    it('should be subscribed to operator filterer subscription contract', async function () {
      const {
        operatorFilterRegistry,
        operatorFilterSubscription,
        landV3,
      } = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.subscriptionOf(landV3.address)
      ).to.be.equal(operatorFilterSubscription.address);
    });

    it('should be able to transfer land if from is the owner of token', async function () {
      const {landV3, users} = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landV3.transferFrom(users[0].address, users[1].address, id);

      expect(await landV3.balanceOf(users[1].address)).to.be.equal(1);
    });

    it('should be able to safe transfer land if from is the owner of token', async function () {
      const {landV3, users} = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landV3['safeTransferFrom(address,address,uint256)'](
        users[0].address,
        users[1].address,
        Number(id)
      );

      expect(await landV3.balanceOf(users[1].address)).to.be.equal(1);
    });

    it('should be able to safe transfer(with data) land if from is the owner of token', async function () {
      const {landV3, users} = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landV3['safeTransferFrom(address,address,uint256,bytes)'](
        users[0].address,
        users[1].address,
        id,
        '0x'
      );

      expect(await landV3.balanceOf(users[1].address)).to.be.equal(1);
    });

    it('should be able to safe batch transfer Land if from is the owner of token', async function () {
      const {landV3, users} = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await landV3.safeBatchTransferFrom(
        users[0].address,
        users[1].address,
        [id1, id2],
        '0x'
      );

      expect(await landV3.balanceOf(users[1].address)).to.be.equal(2);
    });
    it('should be able to batch transfer Land if from is the owner of token', async function () {
      const {landV3, users} = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);

      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await landV3.batchTransferFrom(
        users[0].address,
        users[1].address,
        [id1, id2],
        '0x'
      );

      expect(await landV3.balanceOf(users[1].address)).to.be.equal(2);
    });

    it('should be able to transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {mockMarketPlace1, landV3, users} = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landV3.transferFrom(users[0].address, mockMarketPlace1.address, id);

      expect(await landV3.balanceOf(mockMarketPlace1.address)).to.be.equal(1);
    });

    it('should be able to safe transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {mockMarketPlace1, landV3, users} = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landV3['safeTransferFrom(address,address,uint256)'](
        users[0].address,
        mockMarketPlace1.address,
        id
      );

      expect(await landV3.balanceOf(mockMarketPlace1.address)).to.be.equal(1);
    });

    it('should be able to safe transfer(with data) token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {mockMarketPlace1, landV3, users} = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landV3['safeTransferFrom(address,address,uint256,bytes)'](
        users[0].address,
        mockMarketPlace1.address,
        id,
        '0x'
      );

      expect(await landV3.balanceOf(mockMarketPlace1.address)).to.be.equal(1);
    });

    it('should be able to safe batch transfer Land if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {mockMarketPlace1, landV3, users} = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await landV3.safeBatchTransferFrom(
        users[0].address,
        mockMarketPlace1.address,
        [id1, id2],
        '0x'
      );

      expect(await landV3.balanceOf(mockMarketPlace1.address)).to.be.equal(2);
    });

    it('should be able to batch transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {mockMarketPlace1, landV3, users} = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);

      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await landV3.batchTransferFrom(
        users[0].address,
        mockMarketPlace1.address,
        [id1, id2],
        '0x'
      );

      expect(await landV3.balanceOf(mockMarketPlace1.address)).to.be.equal(2);
    });

    it('it should not approve blacklisted market places', async function () {
      const {mockMarketPlace1, landV3} = await setupOperatorFilter();
      await expect(landV3.approve(mockMarketPlace1.address, 1)).to.be.reverted;
    });

    it('it should not approveFor blacklisted market places', async function () {
      const {mockMarketPlace1, users} = await setupOperatorFilter();
      await expect(
        users[0].landV3.approveFor(
          users[0].address,
          mockMarketPlace1.address,
          1
        )
      ).to.be.reverted;
    });

    it('it should not setApprovalForAll blacklisted market places', async function () {
      const {mockMarketPlace1, users} = await setupOperatorFilter();
      await expect(
        users[0].landV3.setApprovalForAll(mockMarketPlace1.address, true)
      ).to.be.reverted;
    });

    it('it should not setApprovalForAllFor blacklisted market places', async function () {
      const {mockMarketPlace1, users} = await setupOperatorFilter();
      await expect(
        users[0].landV3.setApprovalForAllFor(
          users[0].address,
          mockMarketPlace1.address,
          true
        )
      ).to.be.reverted;
    });

    it('it should approve non blacklisted market places', async function () {
      const {mockMarketPlace3, landV3, users} = await setupOperatorFilter();

      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await users[0].landV3.approve(mockMarketPlace3.address, id);
      expect(await landV3.getApproved(id)).to.be.equal(
        mockMarketPlace3.address
      );
    });

    it('it should approveFor non blacklisted market places', async function () {
      const {mockMarketPlace3, landV3, users} = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);
      await users[0].landV3.approveFor(
        users[0].address,
        mockMarketPlace3.address,
        id
      );
      expect(await landV3.getApproved(id)).to.be.equal(
        mockMarketPlace3.address
      );
    });

    it('it should setApprovalForAll non blacklisted market places', async function () {
      const {mockMarketPlace3, landV3, users} = await setupOperatorFilter();
      users[0].landV3.setApprovalForAll(mockMarketPlace3.address, true);
      expect(
        await landV3.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);
    });

    it('it should setApprovalForAllFor non blacklisted market places', async function () {
      const {mockMarketPlace3, landV3, users} = await setupOperatorFilter();
      users[0].landV3.setApprovalForAllFor(
        users[0].address,
        mockMarketPlace3.address,
        true
      );
      expect(
        await landV3.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);
    });

    it('it should not be able to approve non blacklisted market places after they are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        users,
      } = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await users[0].landV3.approve(mockMarketPlace3.address, id1);

      expect(await landV3.getApproved(id1)).to.be.equal(
        mockMarketPlace3.address
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        users[0].landV3.approve(mockMarketPlace3.address, id2)
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to approveFor non blacklisted market places after they are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        users,
      } = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await users[0].landV3.approveFor(
        users[0].address,
        mockMarketPlace3.address,
        id1
      );

      expect(await landV3.getApproved(id1)).to.be.equal(
        mockMarketPlace3.address
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        users[0].landV3.approveFor(
          users[0].address,
          mockMarketPlace3.address,
          id2
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to setApprovalForAll non blacklisted market places after they are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        users,
      } = await setupOperatorFilter();
      await users[0].landV3.setApprovalForAll(mockMarketPlace3.address, true);

      expect(
        await landV3.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await expect(
        users[1].landV3.setApprovalForAll(mockMarketPlace3.address, true)
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to setApprovalForAllFor non blacklisted market places after they are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        users,
      } = await setupOperatorFilter();
      users[0].landV3.setApprovalForAllFor(
        users[0].address,
        mockMarketPlace3.address,
        true
      );

      expect(
        await landV3.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await expect(
        users[1].landV3.setApprovalForAllFor(
          users[1].address,
          mockMarketPlace3.address,
          true
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to approve non blacklisted market places after there codeHashes are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );

      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await users[0].landV3.approve(mockMarketPlace3.address, id1);

      expect(await landV3.getApproved(id1)).to.be.equal(
        mockMarketPlace3.address
      );

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );

      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        users[0].landV3.approve(mockMarketPlace3.address, id2)
      ).to.be.revertedWith('Codehash is filtered');
    });
    it('it should not be able to approveFor non blacklisted market places after there codeHashes are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );

      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await users[0].landV3.approveFor(
        users[0].address,
        mockMarketPlace3.address,
        id1
      );

      expect(await landV3.getApproved(id1)).to.be.equal(
        mockMarketPlace3.address
      );

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );

      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        users[0].landV3.approveFor(
          users[0].address,
          mockMarketPlace3.address,
          id2
        )
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should not be able to setApprovalForAll non blacklisted market places after there codeHashes are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );

      await users[0].landV3.setApprovalForAll(mockMarketPlace3.address, true);

      expect(
        await landV3.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );

      await expect(
        users[1].landV3.setApprovalForAll(mockMarketPlace3.address, true)
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should not be able to setApprovalForAllFor non blacklisted market places after there codeHashes are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );

      users[0].landV3.setApprovalForAllFor(
        users[0].address,
        mockMarketPlace3.address,
        true
      );

      expect(
        await landV3.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );

      await expect(
        users[1].landV3.setApprovalForAllFor(
          users[1].address,
          mockMarketPlace3.address,
          true
        )
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should be able to approve blacklisted market places after they are removed from the blacklist ', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );

      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await expect(
        users[0].landV3.approve(mockMarketPlace1.address, id)
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false
      );

      await users[0].landV3.approve(mockMarketPlace1.address, id);

      expect(await landV3.getApproved(id)).to.be.equal(
        mockMarketPlace1.address
      );
    });

    it('it should be able to approveFor blacklisted market places after they are removed from the blacklist ', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );

      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await expect(
        users[0].landV3.approveFor(
          users[0].address,
          mockMarketPlace1.address,
          id
        )
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false
      );

      await users[0].landV3.approveFor(
        users[0].address,
        mockMarketPlace1.address,
        id
      );

      expect(await landV3.getApproved(id)).to.be.equal(
        mockMarketPlace1.address
      );
    });

    it('it should be able to setApprovalForAll blacklisted market places after they are removed from the blacklist ', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );

      await expect(
        users[0].landV3.setApprovalForAll(mockMarketPlace1.address, true)
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false
      );

      await users[0].landV3.setApprovalForAll(mockMarketPlace1.address, true);

      expect(
        await landV3.isApprovedForAll(
          users[0].address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
    });

    it('it should be able to setApprovalForAllFor blacklisted market places after they are removed from the blacklist ', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );

      await expect(
        users[0].landV3.setApprovalForAllFor(
          users[0].address,
          mockMarketPlace1.address,
          true
        )
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false
      );

      await users[0].landV3.setApprovalForAllFor(
        users[0].address,
        mockMarketPlace1.address,
        true
      );

      expect(
        await landV3.isApprovedForAll(
          users[0].address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
    });

    it('it should not be able to transfer through blacklisted market places', async function () {
      const {mockMarketPlace1, landV3, users} = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await users[0].landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true
      );
      await expect(
        mockMarketPlace1['transferLand(address,address,address,uint256,bytes)'](
          landV3.address,
          users[0].address,
          users[1].address,
          id,
          '0x'
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to transfer through market places after they are blacklisted', async function () {
      const {
        mockMarketPlace3,
        landV3,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
      } = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);

      await users[0].landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3[
        'transferLand(address,address,address,uint256,bytes)'
      ](landV3.address, users[0].address, users[1].address, id1, '0x');

      expect(await landV3.balanceOf(users[1].address)).to.be.equal(1);

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        mockMarketPlace3['transferLand(address,address,address,uint256,bytes)'](
          landV3.address,
          users[0].address,
          users[1].address,
          id2,
          '0x'
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should be able to transfer through non blacklisted market places', async function () {
      const {mockMarketPlace3, landV3, users} = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await users[0].landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );
      await mockMarketPlace3[
        'transferLand(address,address,address,uint256,bytes)'
      ](landV3.address, users[0].address, users[1].address, id, '0x');

      expect(await landV3.balanceOf(users[1].address)).to.be.equal(1);
    });

    it('it should not be able to transfer through non blacklisted market places after their codeHash is blacklisted', async function () {
      const {
        mockMarketPlace3,
        landV3,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
      } = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);

      await users[0].landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );
      await mockMarketPlace3[
        'transferLand(address,address,address,uint256,bytes)'
      ](landV3.address, users[0].address, users[1].address, id1, '0x');

      expect(await landV3.balanceOf(users[1].address)).to.be.equal(1);

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );
      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        mockMarketPlace3['transferLand(address,address,address,uint256,bytes)'](
          landV3.address,
          users[0].address,
          users[1].address,
          id2,
          '0x'
        )
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should be able to transfer through blacklisted market places after they are removed from blacklist', async function () {
      const {
        mockMarketPlace1,
        landV3,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
      } = await setupOperatorFilter();
      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await users[0].landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true
      );

      await expect(
        mockMarketPlace1['transferLand(address,address,address,uint256,bytes)'](
          landV3.address,
          users[0].address,
          users[1].address,
          id,
          '0x'
        )
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false
      );
      await mockMarketPlace1[
        'transferLand(address,address,address,uint256,bytes)'
      ](landV3.address, users[0].address, users[1].address, id, '0x');

      expect(await landV3.balanceOf(users[1].address)).to.be.equal(1);
    });

    it('it should not be able to transfer(without data) through blacklisted market places', async function () {
      const {mockMarketPlace1, landV3, users} = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await users[0].landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true
      );
      await expect(
        mockMarketPlace1['transferLand(address,address,address,uint256)'](
          landV3.address,
          users[0].address,
          users[1].address,
          id
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should be able to transfer(without data) through non blacklisted market places', async function () {
      const {mockMarketPlace3, landV3, users} = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await users[0].landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3['transferLand(address,address,address,uint256)'](
        landV3.address,
        users[0].address,
        users[1].address,
        id
      );

      expect(await landV3.balanceOf(users[1].address)).to.be.equal(1);
    });

    it('it should be not be able to transfer(without data) through market places after they are blacklisted', async function () {
      const {
        mockMarketPlace3,
        landV3,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
      } = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await users[0].landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3['transferLand(address,address,address,uint256)'](
        landV3.address,
        users[0].address,
        users[1].address,
        id
      );

      expect(await landV3.balanceOf(users[1].address)).to.be.equal(1);

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await users[1].landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await expect(
        mockMarketPlace3['transferLand(address,address,address,uint256)'](
          landV3.address,
          users[1].address,
          users[0].address,
          id
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should be not be able to transfer(without data) through market places after their codeHash is blackListed', async function () {
      const {
        mockMarketPlace3,
        landV3,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
      } = await setupOperatorFilter();
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await users[0].landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3['transferLand(address,address,address,uint256)'](
        landV3.address,
        users[0].address,
        users[1].address,
        id
      );

      expect(await landV3.balanceOf(users[1].address)).to.be.equal(1);

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );

      await users[1].landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await expect(
        mockMarketPlace3['transferLand(address,address,address,uint256)'](
          landV3.address,
          users[1].address,
          users[0].address,
          id
        )
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should be able to transfer(without data) through blacklisted market places after they are removed from blacklist', async function () {
      const {
        mockMarketPlace1,
        landV3,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
      } = await setupOperatorFilter();
      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );
      await landV3.mintQuadWithOutMinterCheck(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await users[0].landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true
      );
      await expect(
        mockMarketPlace1['transferLand(address,address,address,uint256)'](
          landV3.address,
          users[0].address,
          users[1].address,
          id
        )
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false
      );

      await mockMarketPlace1['transferLand(address,address,address,uint256)'](
        landV3.address,
        users[0].address,
        users[1].address,
        id
      );

      expect(await landV3.balanceOf(users[1].address)).to.be.equal(1);
    });
  });
});
