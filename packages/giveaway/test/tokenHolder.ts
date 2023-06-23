import {ethers} from 'hardhat';
import {solidityPack} from 'ethers/lib/utils';
import {BigNumber} from 'ethers';
import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {setupTokenHolder} from './fixtures';
import {Claim, TokenType} from './claim';

describe('TokenHolder.sol', function () {
  describe('initializatioonly operaton', function () {
    it('interfaces', async function () {
      const fixtures = await loadFixture(setupTokenHolder);
      const interfaces = {
        IERC165: '0x01ffc9a7',
        IAccessControl: '0x7965db0b',
        IERC721Receiver: '0x150b7a02',
        IERC1155Receiver: '0x4e2312e0',
        IAccessControlEnumerable: '0x5a05180f',
      };
      for (const i of Object.values(interfaces)) {
        expect(await fixtures.contract.supportsInterface(i)).to.be.true;
      }
      // for coverage
      expect(await fixtures.contract.supportsInterface('0xffffffff')).to.be
        .false;
    });
  });
  describe('roles', function () {
    it('admin', async function () {
      const fixtures = await loadFixture(setupTokenHolder);

      const defaultAdminRole = await fixtures.contract.DEFAULT_ADMIN_ROLE();
      expect(
        await fixtures.contract.hasRole(
          defaultAdminRole,
          fixtures.admin.address
        )
      ).to.be.true;
    });

    it('operator', async function () {
      const fixtures = await loadFixture(setupTokenHolder);

      const operatorRole = await fixtures.contract.OPERATOR_ROLE();
      expect(
        await fixtures.contract.hasRole(operatorRole, fixtures.admin.address)
      ).to.be.false;
      expect(
        await fixtures.contract.hasRole(operatorRole, fixtures.operator.address)
      ).to.be.true;
    });
  });

  describe('transfer', function () {
    it('should be able to transfer', async function () {
      const fixtures = await loadFixture(setupTokenHolder);

      const amount = ethers.utils.parseEther('5');
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await fixtures.mintAndTransfer(fixtures.contract.address, claims);
    });
    it('should fail to transfer if not operator', async function () {
      const fixtures = await loadFixture(setupTokenHolder);

      const amount = ethers.utils.parseEther('5');
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await fixtures.sandToken.mint(fixtures.other.address, amount);
      await expect(
        fixtures.contract.transfer(
          await fixtures.getTransfers(
            claims,
            fixtures.other.address,
            fixtures.dest.address
          )
        )
      ).to.be.revertedWith('only operator');
    });
    it('should be able to transfer multiple tokens', async function () {
      const fixtures = await loadFixture(setupTokenHolder);

      const amount = ethers.utils.parseEther('5');
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
        {
          tokenType: TokenType.ERC721,
          token: fixtures.landToken,
          tokenId: 123,
        },
        {
          tokenType: TokenType.ERC721_SAFE,
          token: fixtures.landToken,
          tokenId: 124,
        },
        {
          tokenType: TokenType.ERC1155,
          token: fixtures.assetToken,
          tokenId: 456,
          amount,
          data: [],
        },
        {
          tokenType: TokenType.ERC1155_BATCH,
          token: fixtures.assetToken,
          tokenIds: [457, 458],
          amounts: [12, 13],
          data: [],
        },
      ];
      await fixtures.contractAsAdmin.setMaxTransferEntries(claims.length);
      await fixtures.mintAndTransfer(fixtures.contract.address, claims);
    });
    it('should be able to transfer with approve', async function () {
      const fixtures = await loadFixture(setupTokenHolder);

      const amount = ethers.utils.parseEther('5');
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await fixtures.sandToken.mint(fixtures.other.address, amount);
      await fixtures.sandTokenAsOther.approve(
        fixtures.contract.address,
        amount
      );
      const pre = await fixtures.balances(fixtures.other.address, claims);
      const preDest = await fixtures.balances(fixtures.dest.address, claims);
      await fixtures.contractAsOperator.transfer(
        await fixtures.getTransfers(
          claims,
          fixtures.other.address,
          fixtures.dest.address
        )
      );
      await fixtures.checkBalances(
        fixtures.other.address,
        pre,
        preDest,
        claims
      );
    });
    it('should be fail to transfer ERC1155 in batch if wrong len', async function () {
      const fixtures = await loadFixture(setupTokenHolder);
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC1155_BATCH,
          token: fixtures.assetToken,
          tokenIds: [12],
          amounts: [],
          data: [],
        },
      ];
      await expect(
        fixtures.contractAsOperator.transfer(
          await fixtures.getTransfers(
            claims,
            fixtures.contract.address,
            fixtures.dest.address
          )
        )
      ).to.revertedWith('ERC1155: ids and amounts length mismatch');
    });

    it('transfer with metaTX trusted forwarder', async function () {
      const fixtures = await loadFixture(setupTokenHolder);
      const amount = ethers.utils.parseEther('5');
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await fixtures.mintTo(fixtures.contract.address, claims);
      const pre = await fixtures.balances(fixtures.contract.address, claims);
      const preDest = await fixtures.balances(fixtures.dest.address, claims);
      const contractAsTrustedForwarder = await fixtures.contactDeploy.connect(
        fixtures.trustedForwarder
      );
      const txData =
        await contractAsTrustedForwarder.populateTransaction.transfer(
          await fixtures.getTransfers(
            claims,
            fixtures.contract.address,
            fixtures.dest.address
          )
        );
      // The msg.sender goes at the end.
      txData.data = solidityPack(
        ['bytes', 'address'],
        [txData.data, fixtures.operator.address]
      );
      await contractAsTrustedForwarder.signer.sendTransaction(txData);
      await fixtures.checkBalances(
        fixtures.contract.address,
        pre,
        preDest,
        claims
      );
    });
    describe('recoverAssets', function () {
      it('admin should be able to recover assets', async function () {
        const fixtures = await loadFixture(setupTokenHolder);

        const amount = ethers.utils.parseEther('5');
        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount,
          },
        ];
        await fixtures.mintTo(fixtures.contract.address, claims);
        const pre = BigNumber.from(
          await fixtures.sandToken.balanceOf(fixtures.contract.address)
        );
        await fixtures.contractAsAdmin.recoverAssets(
          await fixtures.getTransfers(
            claims,
            fixtures.contract.address,
            fixtures.dest.address
          )
        );
        const pos = BigNumber.from(
          await fixtures.sandToken.balanceOf(fixtures.contract.address)
        );
        expect(pos).to.be.equal(pre.sub(amount));
      });
      it('should fail to recover assets if not admin', async function () {
        const fixtures = await loadFixture(setupTokenHolder);

        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount: ethers.utils.parseEther('5'),
          },
        ];
        await fixtures.mintTo(fixtures.contract.address, claims);
        await expect(
          fixtures.contract.recoverAssets(
            await fixtures.getTransfers(
              claims,
              fixtures.contract.address,
              fixtures.dest.address
            )
          )
        ).to.be.revertedWith('only admin');
        await expect(
          fixtures.contractAsOperator.recoverAssets(
            await fixtures.getTransfers(
              claims,
              fixtures.contract.address,
              fixtures.dest.address
            )
          )
        ).to.be.revertedWith('only admin');
      });
    });

    describe('pause', function () {
      it('should fail to pause if not admin', async function () {
        const fixtures = await loadFixture(setupTokenHolder);

        await expect(fixtures.contract.pause()).to.be.revertedWith(
          'only backoffice'
        );
      });
      it('should fail to unpause if not admin', async function () {
        const fixtures = await loadFixture(setupTokenHolder);

        await fixtures.contractAsAdmin.pause();
        await expect(fixtures.contract.unpause()).to.be.revertedWith(
          'only admin'
        );
      });
      it('should fail to transfer if paused by backoffice admin', async function () {
        const fixtures = await loadFixture(setupTokenHolder);

        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount: ethers.utils.parseEther('5'),
          },
        ];
        await fixtures.contractAsBackofficeAdmin.pause();
        await expect(
          fixtures.mintAndTransfer(fixtures.contract.address, claims)
        ).to.be.revertedWith('Pausable: paused');
      });
      it('should be able to transfer sand after pause/unpause', async function () {
        const fixtures = await loadFixture(setupTokenHolder);

        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount: ethers.utils.parseEther('5'),
          },
        ];
        await fixtures.contractAsAdmin.pause();
        await expect(
          fixtures.mintAndTransfer(fixtures.contract.address, claims)
        ).to.be.revertedWith('Pausable: paused');

        await fixtures.contractAsAdmin.unpause();

        await fixtures.mintAndTransfer(fixtures.contract.address, claims);
      });
    });

    describe('fixed limits', function () {
      it('admin should be able to set limits', async function () {
        const fixtures = await loadFixture(setupTokenHolder);
        expect(
          await fixtures.contractAsAdmin.getMaxTransferEntries()
        ).to.be.equal(1);
        await expect(fixtures.contractAsAdmin.setMaxTransferEntries(2))
          .to.emit(fixtures.contract, 'MaxTransferEntriesSet')
          .withArgs(2, fixtures.admin.address);
        expect(
          await fixtures.contractAsAdmin.getMaxTransferEntries()
        ).to.be.equal(2);
      });

      it('others should fail to set limits', async function () {
        const fixtures = await loadFixture(setupTokenHolder);

        await expect(
          fixtures.contractAsBackofficeAdmin.setMaxTransferEntries(1)
        ).to.be.revertedWith('only admin');
        await expect(
          fixtures.contract.setMaxTransferEntries(1)
        ).to.be.revertedWith('only admin');
      });

      it('maxTransferEntries should be grater than 0', async function () {
        const fixtures = await loadFixture(setupTokenHolder);

        await expect(
          fixtures.contractAsAdmin.setMaxTransferEntries(0)
        ).to.be.revertedWith('invalid maxTransferEntries');
      });

      it('should fail to transfer if over max entries', async function () {
        const fixtures = await loadFixture(setupTokenHolder);

        const amount = ethers.utils.parseEther('5');
        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount,
          },
          {
            tokenType: TokenType.ERC721,
            token: fixtures.landToken,
            tokenId: 123,
          },
          {
            tokenType: TokenType.ERC1155,
            token: fixtures.assetToken,
            tokenId: 456,
            amount,
            data: [],
          },
        ];
        await fixtures.contractAsAdmin.setMaxTransferEntries(2);
        expect(
          await fixtures.contractAsAdmin.getMaxTransferEntries()
        ).to.be.equal(2);
        await expect(
          fixtures.mintAndTransfer(fixtures.contract.address, claims)
        ).to.revertedWith('too many transfers');
      });
    });

    describe('coverage', function () {
      it('check the trusted forwarder', async function () {
        const fixtures = await loadFixture(setupTokenHolder);
        expect(await fixtures.contract.getTrustedForwarder()).to.be.equal(
          fixtures.trustedForwarder.address
        );
        expect(await fixtures.contract.trustedForwarder()).to.be.equal(
          fixtures.trustedForwarder.address
        );
      });
      it('should fail to initialize twice', async function () {
        const fixtures = await loadFixture(setupTokenHolder);
        await expect(
          fixtures.contractAsDeployer.initialize(
            fixtures.trustedForwarder.address,
            fixtures.admin.address
          )
        ).to.revertedWith('Initializable: contract is already initialized');
      });
      it('should fail to transfer with no balance', async function () {
        const fixtures = await loadFixture(setupTokenHolder);
        const amount = ethers.utils.parseEther('5');
        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount,
          },
        ];
        await expect(
          fixtures.contractAsOperator.transfer(
            await fixtures.getTransfers(
              claims,
              fixtures.contract.address,
              fixtures.dest.address
            )
          )
        ).to.revertedWith('ERC20: transfer amount exceeds balance');
      });
      it('should fail to transfer with approve when no balance', async function () {
        const fixtures = await loadFixture(setupTokenHolder);
        const amount = ethers.utils.parseEther('5');
        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount,
          },
        ];
        await fixtures.sandTokenAsOther.approve(
          fixtures.contract.address,
          amount
        );
        await expect(
          fixtures.contractAsOperator.transfer(
            await fixtures.getTransfers(
              claims,
              fixtures.contract.address,
              fixtures.dest.address
            )
          )
        ).to.revertedWith('ERC20: transfer amount exceeds balance');
      });
    });
  });
});
