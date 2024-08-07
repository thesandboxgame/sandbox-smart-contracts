import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {setupOFTSand} from './fixtures';
import {ethers} from 'hardhat';
import {ZeroAddress} from 'ethers';
import {Options} from '@layerzerolabs/lz-v2-utilities';

describe('OFT Contracts', function () {
  describe('OFTSand.sol', function () {
    it('only OFTSand owner can set trusted forwarder', async function () {
      const {TrustedForwarder, user1, OFTSand} =
        await loadFixture(setupOFTSand);
      expect(await OFTSand.getTrustedForwarder()).to.be.equal(TrustedForwarder);
      await expect(OFTSand.connect(user1).setTrustedForwarder(ZeroAddress))
        .to.be.revertedWithCustomError(OFTSand, 'OwnableUnauthorizedAccount')
        .withArgs(user1.address);
    });

    it('OFTSand owner can set trusted forwarder', async function () {
      const {TrustedForwarder, oftSandOwner, OFTSand} =
        await loadFixture(setupOFTSand);
      expect(await OFTSand.getTrustedForwarder()).to.be.equal(TrustedForwarder);
      await OFTSand.connect(oftSandOwner).setTrustedForwarder(ZeroAddress);
      expect(await OFTSand.getTrustedForwarder()).to.be.equal(ZeroAddress);
    });

    it('only OFTSand admin can enable or disable the send function', async function () {
      const {OFTSand, user1} = await loadFixture(setupOFTSand);
      expect(await OFTSand.getEnabled()).to.be.true;
      await expect(
        OFTSand.connect(user1).enable(false),
      ).to.be.revertedWithCustomError(OFTSand, 'OnlyAdmin');
    });

    it('OFTSand admin can enable or disable the send function', async function () {
      const {OFTSand, sandAdmin} = await loadFixture(setupOFTSand);

      expect(await OFTSand.getEnabled()).to.be.true;

      await OFTSand.connect(sandAdmin).enable(false);
      expect(await OFTSand.getEnabled()).to.be.false;

      await OFTSand.connect(sandAdmin).enable(true);
      expect(await OFTSand.getEnabled()).to.be.true;
    });

    it('should emit Enabled event for OFTSand', async function () {
      const {OFTSand, sandAdmin} = await loadFixture(setupOFTSand);
      const tx = await OFTSand.connect(sandAdmin).enable(false);
      await expect(tx).to.emit(OFTSand, 'Enabled').withArgs(false);
    });

    it('should return false for approvalRequired', async function () {
      const {OFTSand} = await loadFixture(setupOFTSand);
      expect(await OFTSand.approvalRequired()).to.equal(false);
    });

    it('should return the contract address for token()', async function () {
      const {OFTSand} = await loadFixture(setupOFTSand);
      expect(await OFTSand.token()).to.equal(await OFTSand.getAddress());
    });
  });

  describe('OFTAdapterForSand.sol', function () {
    it('only OFTAdapter owner can set trusted forwarder', async function () {
      const {TrustedForwarder, user1, OFTAdapter} =
        await loadFixture(setupOFTSand);
      expect(await OFTAdapter.getTrustedForwarder()).to.be.equal(
        TrustedForwarder,
      );
      await expect(OFTAdapter.connect(user1).setTrustedForwarder(ZeroAddress))
        .to.be.revertedWithCustomError(OFTAdapter, 'OwnableUnauthorizedAccount')
        .withArgs(user1.address);
    });

    it('OFTAdapter owner can set trusted forwarder', async function () {
      const {TrustedForwarder, oftAdapterOwner, OFTAdapter} =
        await loadFixture(setupOFTSand);
      expect(await OFTAdapter.getTrustedForwarder()).to.be.equal(
        TrustedForwarder,
      );
      await OFTAdapter.connect(oftAdapterOwner).setTrustedForwarder(
        ZeroAddress,
      );
      expect(await OFTAdapter.getTrustedForwarder()).to.be.equal(ZeroAddress);
    });

    it('only OFTAdapter admin can enable or disable the send function', async function () {
      const {OFTAdapter, user1} = await loadFixture(setupOFTSand);
      expect(await OFTAdapter.getEnabled()).to.be.true;
      await expect(
        OFTAdapter.connect(user1).enable(false),
      ).to.be.revertedWithCustomError(OFTAdapter, 'OnlyAdmin');
    });

    it('OFTAdapter admin can enable or disable the send function', async function () {
      const {OFTAdapter, oftAdapterAdmin} = await loadFixture(setupOFTSand);
      expect(await OFTAdapter.getEnabled()).to.be.true;

      await OFTAdapter.connect(oftAdapterAdmin).enable(false);
      expect(await OFTAdapter.getEnabled()).to.be.false;

      await OFTAdapter.connect(oftAdapterAdmin).enable(true);
      expect(await OFTAdapter.getEnabled()).to.be.true;
    });

    it('should emit Enabled event for OFTAdapter', async function () {
      const {OFTAdapter, oftAdapterAdmin} = await loadFixture(setupOFTSand);
      const tx = await OFTAdapter.connect(oftAdapterAdmin).enable(false);
      await expect(tx).to.emit(OFTAdapter, 'Enabled').withArgs(false);
    });
  });

  describe('token transfer using send', function () {
    it('should correctly set Sand contract as token in OFTAdapter', async function () {
      const {OFTAdapter, SandMock} = await loadFixture(setupOFTSand);
      expect(await OFTAdapter.token()).to.be.equal(SandMock);
    });

    it('should correctly set OFTSand and Adapter as peers to each other', async function () {
      const {OFTSand, OFTAdapter, eidAdapter, eidOFTSand} =
        await loadFixture(setupOFTSand);
      expect(await OFTAdapter.peers(eidOFTSand)).to.be.equal(
        ethers.zeroPadValue(await OFTSand.getAddress(), 32),
      );
      expect(await OFTSand.peers(eidAdapter)).to.be.equal(
        ethers.zeroPadValue(await OFTAdapter.getAddress(), 32),
      );
    });

    it('should allow ERC20 token owner to approve the OFTAdapter to use tokens', async function () {
      const {SandMock, OFTAdapter, user1} = await loadFixture(setupOFTSand);
      expect(await SandMock.balanceOf(user1)).to.be.equal(
        ethers.parseEther('1'),
      );
      await SandMock.connect(user1).approve(OFTAdapter, ethers.parseEther('1'));

      expect(await SandMock.allowance(user1, OFTAdapter)).to.be.equal(
        ethers.parseEther('1'),
      );
    });

    it('should not transfer ERC20 tokens from OFTAdapter when send function is disabled', async function () {
      const {OFTAdapter, oftAdapterAdmin, user1, eidOFTSand} =
        await loadFixture(setupOFTSand);

      // disable send() in OFTAdapter
      await OFTAdapter.connect(oftAdapterAdmin).enable(false);
      expect(await OFTAdapter.getEnabled()).to.be.false;

      const decimalConversionRate = await OFTAdapter.decimalConversionRate();

      const options = Options.newOptions()
        .addExecutorLzReceiveOption(200000, 0)
        .toHex()
        .toString();

      const sendParam = [
        eidOFTSand,
        ethers.zeroPadValue(await user1.getAddress(), 32),
        decimalConversionRate,
        decimalConversionRate,
        options,
        '0x',
        '0x',
      ];

      const [nativeFee] = await OFTAdapter.quoteSend(sendParam, 0);
      await expect(
        OFTAdapter.connect(user1).send(
          sendParam,
          [nativeFee, 0],
          user1.getAddress(),
          {
            value: nativeFee,
          },
        ),
      ).to.be.revertedWithCustomError(OFTAdapter, 'SendFunctionDisabled');
    });

    it('should not transfer ERC20 tokens from OFTAdapter to OFTSand if amount to send is less than the decimalConversionRate', async function () {
      const {OFTSand, OFTAdapter, SandMock, user1, user2, eidOFTSand} =
        await loadFixture(setupOFTSand);

      const decimalConversionRate = await OFTAdapter.decimalConversionRate();
      const tokensToSend = decimalConversionRate / 10n;
      await SandMock.connect(user1).approve(OFTAdapter, tokensToSend);
      expect(await OFTSand.balanceOf(user2)).to.be.equal(0);

      const options = Options.newOptions()
        .addExecutorLzReceiveOption(200000, 0)
        .toHex()
        .toString();

      const sendParam = [
        eidOFTSand,
        ethers.zeroPadValue(await user2.getAddress(), 32),
        tokensToSend,
        tokensToSend,
        options,
        '0x',
        '0x',
      ];

      await expect(
        OFTAdapter.quoteSend(sendParam, 0),
      ).to.be.revertedWithCustomError(OFTAdapter, 'SlippageExceeded');
    });

    it('should not transfer ERC20 tokens from OFTAdapter if peer is not set', async function () {
      const {OFTSand, OFTAdapter, SandMock, user1, user2} =
        await loadFixture(setupOFTSand);

      const initalBalanceUser1 = await SandMock.balanceOf(user1);
      const tokensToSend = initalBalanceUser1 / 1000000n;
      await SandMock.connect(user1).approve(OFTAdapter, tokensToSend);
      expect(await OFTSand.balanceOf(user2)).to.be.equal(0);

      const options = Options.newOptions()
        .addExecutorLzReceiveOption(200000, 0)
        .toHex()
        .toString();

      const sendParam = [
        4, // destination endpoint not yet used to set peer for OFTAdapter
        ethers.zeroPadValue(await user2.getAddress(), 32),
        tokensToSend,
        tokensToSend,
        options,
        '0x',
        '0x',
      ];

      await expect(
        OFTAdapter.quoteSend(sendParam, 0),
      ).to.be.revertedWithCustomError(OFTAdapter, 'NoPeer');
    });

    it('should transfer ERC20 tokens from Adapter to OFTSand using LayerZero', async function () {
      const {OFTSand, OFTAdapter, SandMock, user1, user2, eidOFTSand} =
        await loadFixture(setupOFTSand);

      const initalBalanceUser1 = await SandMock.balanceOf(user1);
      const tokensToSend = initalBalanceUser1 / 1000000n;
      await SandMock.connect(user1).approve(OFTAdapter, tokensToSend);
      expect(await OFTSand.balanceOf(user2)).to.be.equal(0);

      const options = Options.newOptions()
        .addExecutorLzReceiveOption(200000, 0)
        .toHex()
        .toString();

      const sendParam = [
        eidOFTSand,
        ethers.zeroPadValue(await user2.getAddress(), 32),
        tokensToSend,
        tokensToSend,
        options,
        '0x',
        '0x',
      ];

      const [nativeFee] = await OFTAdapter.quoteSend(sendParam, 0);

      await OFTAdapter.connect(user1).send(
        sendParam,
        [nativeFee, 0],
        user1.getAddress(),
        {
          value: nativeFee,
        },
      );

      const finalBalanceUser1 = await SandMock.balanceOf(user1.getAddress());
      const finalBalanceUser2 = await OFTSand.balanceOf(user2.address);
      expect(initalBalanceUser1 - tokensToSend).to.be.equal(finalBalanceUser1);
      expect(finalBalanceUser2).to.be.equal(tokensToSend);
    });

    it('should correctly set OFTSand and OFTSand2 as peers to each other', async function () {
      const {OFTSand, OFTSand2, eidOFTSand, eidOFTSand2} =
        await loadFixture(setupOFTSand);
      expect(await OFTSand.peers(eidOFTSand2)).to.be.equal(
        ethers.zeroPadValue(await OFTSand2.getAddress(), 32),
      );
      expect(await OFTSand2.peers(eidOFTSand)).to.be.equal(
        ethers.zeroPadValue(await OFTSand.getAddress(), 32),
      );
    });

    it('should not transfer ERC20 tokens from OFTSand when send function is disabled', async function () {
      const {
        OFTAdapter,
        OFTSand,
        SandMock,
        sandAdmin,
        user1,
        user2,
        user3,
        eidOFTSand,
        eidOFTSand2,
      } = await loadFixture(setupOFTSand);

      const initalBalanceUser1 = await SandMock.balanceOf(user1);
      const tokensToSend = initalBalanceUser1 / 1000000n;
      await SandMock.connect(user1).approve(OFTAdapter, tokensToSend);
      expect(await OFTSand.balanceOf(user2)).to.be.equal(0);

      const options = Options.newOptions()
        .addExecutorLzReceiveOption(200000, 0)
        .toHex()
        .toString();

      const sendParam = [
        eidOFTSand,
        ethers.zeroPadValue(await user2.getAddress(), 32),
        tokensToSend,
        tokensToSend,
        options,
        '0x',
        '0x',
      ];

      const [nativeFee] = await OFTAdapter.quoteSend(sendParam, 0);

      await OFTAdapter.connect(user1).send(
        sendParam,
        [nativeFee, 0],
        user1.getAddress(),
        {
          value: nativeFee,
        },
      );

      expect(await SandMock.balanceOf(user1)).to.be.equal(
        initalBalanceUser1 - tokensToSend,
      );
      expect(await OFTSand.balanceOf(user2)).to.be.equal(tokensToSend);

      // disable send() in OFTSand
      await OFTSand.connect(sandAdmin).enable(false);
      expect(await OFTSand.getEnabled()).to.be.false;

      const sendParam2 = [
        eidOFTSand2,
        ethers.zeroPadValue(await user3.getAddress(), 32),
        tokensToSend,
        tokensToSend,
        options,
        '0x',
        '0x',
      ];

      const [nativeFee2] = await OFTSand.quoteSend(sendParam2, 0);

      await expect(
        OFTSand.connect(user2).send(
          sendParam2,
          [nativeFee2, 0],
          user2.getAddress(),
          {
            value: nativeFee2,
          },
        ),
      ).to.be.revertedWithCustomError(OFTSand, 'SendFunctionDisabled');
    });

    it('should transfer ERC20 tokens from OFTSand to OFTSand2 using LayerZero', async function () {
      const {
        OFTAdapter,
        OFTSand,
        OFTSand2,
        SandMock,
        user1,
        user2,
        user3,
        eidOFTSand,
        eidOFTSand2,
      } = await loadFixture(setupOFTSand);

      const initalBalanceUser1 = await SandMock.balanceOf(user1);
      const tokensToSend = initalBalanceUser1 / 1000000n;
      await SandMock.connect(user1).approve(OFTAdapter, tokensToSend);
      expect(await OFTSand.balanceOf(user2)).to.be.equal(0);

      const options = Options.newOptions()
        .addExecutorLzReceiveOption(200000, 0)
        .toHex()
        .toString();

      const sendParam = [
        eidOFTSand,
        ethers.zeroPadValue(await user2.getAddress(), 32),
        tokensToSend,
        tokensToSend,
        options,
        '0x',
        '0x',
      ];

      const [nativeFee] = await OFTAdapter.quoteSend(sendParam, 0);

      await OFTAdapter.connect(user1).send(
        sendParam,
        [nativeFee, 0],
        user1.getAddress(),
        {
          value: nativeFee,
        },
      );

      expect(await SandMock.balanceOf(user1)).to.be.equal(
        initalBalanceUser1 - tokensToSend,
      );
      expect(await OFTSand.balanceOf(user2)).to.be.equal(tokensToSend);

      const sendParam2 = [
        eidOFTSand2,
        ethers.zeroPadValue(await user3.getAddress(), 32),
        tokensToSend,
        tokensToSend,
        options,
        '0x',
        '0x',
      ];

      const [nativeFee2] = await OFTSand.quoteSend(sendParam2, 0);

      await OFTSand.connect(user2).send(
        sendParam2,
        [nativeFee2, 0],
        user2.getAddress(),
        {
          value: nativeFee2,
        },
      );

      expect(await OFTSand.balanceOf(user2)).to.be.equal(0);
      expect(await OFTSand2.balanceOf(user3)).to.be.equal(tokensToSend);
    });

    it('should correctly set OFTAdapter and OFTSand2 as peers to each other', async function () {
      const {OFTAdapter, OFTSand2, eidAdapter, eidOFTSand2} =
        await loadFixture(setupOFTSand);
      expect(await OFTAdapter.peers(eidOFTSand2)).to.be.equal(
        ethers.zeroPadValue(await OFTSand2.getAddress(), 32),
      );
      expect(await OFTSand2.peers(eidAdapter)).to.be.equal(
        ethers.zeroPadValue(await OFTAdapter.getAddress(), 32),
      );
    });

    it('transfer ERC20 tokens among OFTAdapter, OFTSand, and OFTSand2 using LayerZero', async function () {
      const {
        OFTAdapter,
        OFTSand,
        OFTSand2,
        SandMock,
        user1,
        user2,
        user3,
        eidAdapter,
        eidOFTSand,
        eidOFTSand2,
      } = await loadFixture(setupOFTSand);

      const initalBalanceUser1 = await SandMock.balanceOf(user1);
      const tokensToSend = initalBalanceUser1 / 1000000n;
      await SandMock.connect(user1).approve(OFTAdapter, tokensToSend);
      expect(await OFTSand.balanceOf(user2)).to.be.equal(0);

      const options = Options.newOptions()
        .addExecutorLzReceiveOption(200000, 0)
        .toHex()
        .toString();

      const sendParam = [
        eidOFTSand,
        ethers.zeroPadValue(await user2.getAddress(), 32),
        tokensToSend,
        tokensToSend,
        options,
        '0x',
        '0x',
      ];

      const [nativeFee] = await OFTAdapter.quoteSend(sendParam, 0);

      // Sending tokens from OFTAdapter to OFTSand
      await OFTAdapter.connect(user1).send(
        sendParam,
        [nativeFee, 0],
        user1.getAddress(),
        {
          value: nativeFee,
        },
      );

      const balanceUser1AfterSend = await SandMock.balanceOf(user1);
      expect(balanceUser1AfterSend).to.be.equal(
        initalBalanceUser1 - tokensToSend,
      );
      expect(await OFTSand.balanceOf(user2)).to.be.equal(tokensToSend);

      const sendParam2 = [
        eidOFTSand2,
        ethers.zeroPadValue(await user3.getAddress(), 32),
        tokensToSend,
        tokensToSend,
        options,
        '0x',
        '0x',
      ];
      const [nativeFee2] = await OFTSand.quoteSend(sendParam2, 0);

      // Sending tokens from OFTSand to OFTSand2
      await OFTSand.connect(user2).send(
        sendParam2,
        [nativeFee2, 0],
        user2.getAddress(),
        {
          value: nativeFee2,
        },
      );

      expect(await OFTSand.balanceOf(user2)).to.be.equal(0);
      expect(await OFTSand2.balanceOf(user3)).to.be.equal(tokensToSend);

      const sendParam3 = [
        eidAdapter,
        ethers.zeroPadValue(await user1.getAddress(), 32),
        tokensToSend,
        tokensToSend,
        options,
        '0x',
        '0x',
      ];

      const [nativeFee3] = await OFTSand.quoteSend(sendParam3, 0);

      // Sending tokens from OFTSand2 back to OFTAdapter
      await OFTSand2.connect(user3).send(
        sendParam3,
        [nativeFee3, 0],
        user3.getAddress(),
        {
          value: nativeFee3,
        },
      );

      expect(await OFTSand2.balanceOf(user3)).to.be.equal(0);
      expect(await SandMock.balanceOf(user1)).to.be.equal(
        balanceUser1AfterSend + tokensToSend,
      );
    });

    describe('Meta transaction', function () {
      it('should not transfer ERC20 tokens using LayerZero when msg.value is not equal to nativeFee and not paying in lzToken', async function () {
        const {
          OFTSand,
          OFTAdapter,
          SandMock,
          TrustedForwarder,
          user1,
          user2,
          eidOFTSand,
        } = await loadFixture(setupOFTSand);

        const initalBalanceUser1 = await SandMock.balanceOf(user1);
        const tokensToSend = initalBalanceUser1 / 1000000n;
        await SandMock.connect(user1).approve(OFTAdapter, tokensToSend);

        expect(await OFTSand.balanceOf(user2)).to.be.equal(0);

        const options = Options.newOptions()
          .addExecutorLzReceiveOption(200000, 0)
          .toHex()
          .toString();

        const sendParam = [
          eidOFTSand,
          ethers.zeroPadValue(await user2.getAddress(), 32),
          tokensToSend,
          tokensToSend,
          options,
          '0x',
          '0x',
        ];

        const [nativeFee] = await OFTAdapter.quoteSend(
          sendParam,
          0, // not paying MessagingFee with lzToken
        );

        // Send 1 ETH to TrustedForwarder to cover transaction fees
        await user1.sendTransaction({
          to: await TrustedForwarder.getAddress(),
          value: ethers.parseEther('1.0'),
        });

        // Meta-transaction request with zero msg.value
        const sendRequest = {
          from: await user1.getAddress(),
          to: await OFTAdapter.getAddress(),
          value: 0,
          gasLimit: 1000000,
          data: OFTAdapter.interface.encodeFunctionData('send', [
            sendParam,
            [nativeFee, 0],
            await user1.getAddress(),
          ]),
        };

        // Meta-transaction request with msg.value not equal to nativeFee
        const sendRequest2 = {
          from: await user1.getAddress(),
          to: await OFTAdapter.getAddress(),
          value: Number(nativeFee) + 1,
          gasLimit: 1000000,
          data: OFTAdapter.interface.encodeFunctionData('send', [
            sendParam,
            [nativeFee, 0],
            await user1.getAddress(),
          ]),
        };

        // Execute the meta-transactions via the TrustedForwarder
        await expect(TrustedForwarder.execute(sendRequest)).to.be.revertedWith(
          'Call execution failed',
        );

        await expect(TrustedForwarder.execute(sendRequest2)).to.be.revertedWith(
          'Call execution failed',
        );
      });

      it('should transfer ERC20 tokens from Adapter to OFTSand using LayerZero', async function () {
        const {
          OFTSand,
          OFTAdapter,
          SandMock,
          TrustedForwarder,
          user1,
          user2,
          eidOFTSand,
        } = await loadFixture(setupOFTSand);

        const initalBalanceUser1 = await SandMock.balanceOf(user1);
        const tokensToSend = initalBalanceUser1 / 1000000n;
        await SandMock.connect(user1).approve(OFTAdapter, tokensToSend);

        expect(await OFTSand.balanceOf(user2)).to.be.equal(0);

        const options = Options.newOptions()
          .addExecutorLzReceiveOption(200000, 0)
          .toHex()
          .toString();

        const sendParam = [
          eidOFTSand,
          ethers.zeroPadValue(await user2.getAddress(), 32),
          tokensToSend,
          tokensToSend,
          options,
          '0x',
          '0x',
        ];

        const [nativeFee] = await OFTAdapter.quoteSend(sendParam, 0);

        // Send 1 ETH to TrustedForwarder to cover transaction fees
        await user1.sendTransaction({
          to: await TrustedForwarder.getAddress(),
          value: ethers.parseEther('1.0'),
        });

        // meta-transaction request for sending tokens from OFTAdapter to OFTSand
        const sendRequest = {
          from: await user1.getAddress(),
          to: await OFTAdapter.getAddress(),
          value: Number(nativeFee), // msg.value provided by TrustedForwarder
          gasLimit: 1000000,
          data: OFTAdapter.interface.encodeFunctionData('send', [
            sendParam,
            [nativeFee, 0],
            await user1.getAddress(),
          ]),
        };

        // Execute the meta-transaction via the TrustedForwarder
        await TrustedForwarder.execute(sendRequest);

        const finalBalanceUser1 = await SandMock.balanceOf(user1.getAddress());
        const finalBalanceUser2 = await OFTSand.balanceOf(user2.address);
        expect(initalBalanceUser1 - tokensToSend).to.be.equal(
          finalBalanceUser1,
        );
        expect(finalBalanceUser2).to.be.equal(tokensToSend);
      });

      it('should transfer ERC20 tokens from OFTSand to OFTSand2 using LayerZero', async function () {
        const {
          OFTAdapter,
          OFTSand,
          OFTSand2,
          SandMock,
          TrustedForwarder,
          user1,
          user2,
          user3,
          eidOFTSand,
          eidOFTSand2,
        } = await loadFixture(setupOFTSand);

        const initalBalanceUser1 = await SandMock.balanceOf(user1);
        const tokensToSend = initalBalanceUser1 / 1000000n;
        await SandMock.connect(user1).approve(OFTAdapter, tokensToSend);
        expect(await OFTSand.balanceOf(user2)).to.be.equal(0);

        const options = Options.newOptions()
          .addExecutorLzReceiveOption(200000, 0)
          .toHex()
          .toString();

        const sendParam = [
          eidOFTSand,
          ethers.zeroPadValue(await user2.getAddress(), 32),
          tokensToSend,
          tokensToSend,
          options,
          '0x',
          '0x',
        ];

        const [nativeFee] = await OFTAdapter.quoteSend(sendParam, 0);

        // Send 1 ETH to TrustedForwarder to cover transaction fees
        await user1.sendTransaction({
          to: await TrustedForwarder.getAddress(),
          value: ethers.parseEther('1.0'),
        });

        // meta-transaction request for sending tokens from OFTAdapter to OFTSand
        const sendRequest = {
          from: await user1.getAddress(),
          to: await OFTAdapter.getAddress(),
          value: Number(nativeFee), // msg.value provided by TrustedForwarder
          gasLimit: 1000000,
          data: OFTAdapter.interface.encodeFunctionData('send', [
            sendParam,
            [nativeFee, 0],
            await user1.getAddress(),
          ]),
        };

        // Execute the meta-transaction via the TrustedForwarder
        await TrustedForwarder.execute(sendRequest);

        expect(await SandMock.balanceOf(user1)).to.be.equal(
          initalBalanceUser1 - tokensToSend,
        );
        expect(await OFTSand.balanceOf(user2)).to.be.equal(tokensToSend);

        const sendParam2 = [
          eidOFTSand2,
          ethers.zeroPadValue(await user3.getAddress(), 32),
          tokensToSend,
          tokensToSend,
          options,
          '0x',
          '0x',
        ];
        const [nativeFee2] = await OFTSand.quoteSend(sendParam2, 0);

        // meta-transaction request for sending tokens from OFTSand to OFTSand2
        const sendRequest2 = {
          from: await user2.getAddress(),
          to: await OFTSand.getAddress(),
          value: Number(nativeFee2), // msg.value provided by TrustedForwarder
          gasLimit: 1000000,
          data: OFTAdapter.interface.encodeFunctionData('send', [
            sendParam2,
            [nativeFee2, 0],
            await user2.getAddress(),
          ]),
        };

        // Execute the meta-transaction via the TrustedForwarder
        await TrustedForwarder.execute(sendRequest2);

        expect(await OFTSand.balanceOf(user2)).to.be.equal(0);
        expect(await OFTSand2.balanceOf(user3)).to.be.equal(tokensToSend);
      });
    });
  });
});
