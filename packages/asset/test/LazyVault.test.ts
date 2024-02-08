import {parseEther} from 'ethers/lib/utils';
import {BigNumber} from '@ethersproject/bignumber';
import {expect} from 'chai';
import runSetup from './fixtures/lazyVaultFixture';
import {Event} from 'ethers';

describe('LazyVault (/packages/asset/contracts/LazyVault.sol)', function () {
  describe('General', function () {
    it('should assign DEFAULT_ADMIN to the admin address from the constructor', async function () {
      const {admin, LazyVaultContract} = await runSetup();
      const DEFAULT_ADMIN_ROLE = await LazyVaultContract.DEFAULT_ADMIN_ROLE();
      const hasRole = await LazyVaultContract.hasRole(
        DEFAULT_ADMIN_ROLE,
        admin.address
      );
      expect(hasRole).to.equal(true);
    });
    it('should assign MANAGER_ROLE to the manager address from the constructor', async function () {
      const {manager, LazyVaultContract} = await runSetup();
      const MANAGER_ROLE = await LazyVaultContract.MANAGER_ROLE();
      const hasRole = await LazyVaultContract.hasRole(
        MANAGER_ROLE,
        manager.address
      );
      expect(hasRole).to.equal(true);
    });
    it('should assign DISTRIBUTOR_ROLE to the distributor address from the constructor', async function () {
      const {distributor, LazyVaultContract} = await runSetup();
      const DISTRIBUTOR_ROLE = await LazyVaultContract.DISTRIBUTOR_ROLE();
      const hasRole = await LazyVaultContract.hasRole(
        DISTRIBUTOR_ROLE,
        distributor.address
      );
      expect(hasRole).to.equal(true);
    });
    it('correctly sets the initial split recipients', async function () {
      const {initialRecipients, LazyVaultContract} = await runSetup();
      const contractSplitRecipient1 = await LazyVaultContract.splitRecipients(
        0
      );

      const contractSplitRecipient2 = await LazyVaultContract.splitRecipients(
        1
      );

      expect(contractSplitRecipient1[0]).to.equal(initialRecipients[0].address);
      expect(contractSplitRecipient1[1]).to.equal(initialRecipients[0].split);

      expect(contractSplitRecipient2[0]).to.equal(initialRecipients[1].address);
      expect(contractSplitRecipient2[1]).to.equal(initialRecipients[1].split);
    });
    it('correctly sets the initial tier values', async function () {
      const {initialTierValues, LazyVaultContract} = await runSetup();
      const contractTierValue1 = await LazyVaultContract.tierValues(1);
      const contractTierValue2 = await LazyVaultContract.tierValues(2);

      expect(contractTierValue1).to.equal(initialTierValues[1]);
      expect(contractTierValue2).to.equal(initialTierValues[2]);
    });
    it("corectly sets the vaulted token's address", async function () {
      const {VaultTokenContract, LazyVaultContract} = await runSetup();
      const contractVaultTokenAddress = await LazyVaultContract.vaultToken();

      expect(contractVaultTokenAddress).to.equal(VaultTokenContract.address);
    });
  });
  describe("Manager's functions", function () {
    it('should allow the manager to set new split recipients', async function () {
      const {manager, admin, LazyVaultContract} = await runSetup();
      const newRecipients = [
        {address: manager.address, split: 1000},
        {address: admin.address, split: 2000},
      ];
      await LazyVaultContract.connect(manager).changeSplitRecipients(
        newRecipients.map((recipient) => Object.values(recipient))
      );
      const contractSplitRecipient1 = await LazyVaultContract.splitRecipients(
        0
      );
      const contractSplitRecipient2 = await LazyVaultContract.splitRecipients(
        1
      );
      expect(contractSplitRecipient1[0]).to.equal(newRecipients[0].address);
      expect(contractSplitRecipient1[1]).to.equal(newRecipients[0].split);
      expect(contractSplitRecipient2[0]).to.equal(newRecipients[1].address);
      expect(contractSplitRecipient2[1]).to.equal(newRecipients[1].split);
    });
    it('should NOT allow non-managers to set new split recipients', async function () {
      const {creator1, LazyVaultContract, MANAGER_ROLE} = await runSetup();
      const newRecipients = [
        {address: creator1.address, split: 1000},
        {address: creator1.address, split: 2000},
      ];
      await expect(
        LazyVaultContract.connect(creator1).changeSplitRecipients(
          newRecipients.map((recipient) => Object.values(recipient))
        )
      ).to.be.revertedWith(
        `AccessControl: account ${creator1.address.toLowerCase()} is missing role ${MANAGER_ROLE}`
      );
    });
    it('should allow the manager to set new tier values', async function () {
      const {manager, LazyVaultContract} = await runSetup();
      const newTierValues = [
        parseEther('0'),
        parseEther('333'),
        parseEther('444'),
      ];
      await LazyVaultContract.connect(manager).changeTierValues(newTierValues);
      const contractTierValue1 = await LazyVaultContract.tierValues(1);
      const contractTierValue2 = await LazyVaultContract.tierValues(2);
      expect(contractTierValue1).to.equal(newTierValues[1]);
      expect(contractTierValue2).to.equal(newTierValues[2]);
    });
    it('should NOT allow non-managers to set new tier values', async function () {
      const {creator1, LazyVaultContract, MANAGER_ROLE} = await runSetup();
      const newTierValues = [
        parseEther('0'),
        parseEther('333'),
        parseEther('444'),
      ];
      await expect(
        LazyVaultContract.connect(creator1).changeTierValues(newTierValues)
      ).to.be.revertedWith(
        `AccessControl: account ${creator1.address.toLowerCase()} is missing role ${MANAGER_ROLE}`
      );
    });
    it('should allow the manage to withdraw any amount of the vaulted token', async function () {
      const {manager, LazyVaultContract, VaultTokenContract} = await runSetup();
      const balanceBefore = await VaultTokenContract.balanceOf(
        LazyVaultContract.address
      );

      await expect(
        LazyVaultContract.connect(manager).withdraw(parseEther('100'))
      ).to.not.be.reverted;
      const balanceAfter = await VaultTokenContract.balanceOf(
        LazyVaultContract.address
      );

      expect(balanceBefore.sub(balanceAfter)).to.equal(parseEther('100'));
    });
    it('should NOT allow non-managers to withdraw any amount of the vaulted token', async function () {
      const {creator1, LazyVaultContract, MANAGER_ROLE} = await runSetup();
      await expect(
        LazyVaultContract.connect(creator1).withdraw(parseEther('100'))
      ).to.be.revertedWith(
        `AccessControl: account ${creator1.address.toLowerCase()} is missing role ${MANAGER_ROLE}`
      );
    });
  });
  describe("Distributor's functions", function () {
    describe('Distribution calculations', function () {
      it("should allow the distributor to distribute the vaulted token's balance", async function () {
        const {distributor, creator1, LazyVaultContract} = await runSetup();
        const tiers = [1];
        const amounts = [2];

        await expect(
          LazyVaultContract.connect(distributor).distribute(tiers, amounts, [
            creator1.address,
          ])
        ).to.not.be.reverted;
      });
      it("should NOT allow non-distributors to distribute the vaulted token's balance", async function () {
        const {creator1, DISTRIBUTOR_ROLE, LazyVaultContract} =
          await runSetup();
        const tiers = [1];
        const amounts = [2];

        await expect(
          LazyVaultContract.connect(creator1).distribute(tiers, amounts, [
            creator1.address,
          ])
        ).to.be.revertedWith(
          `AccessControl: account ${creator1.address.toLowerCase()} is missing role ${DISTRIBUTOR_ROLE}`
        );
      });
      it("should correctly distribute the split to the recipients' addresses", async function () {
        const {
          distributor,
          creator1,
          initialRecipients,
          LazyVaultContract,
          VaultTokenContract,
          calculateTotalToDistribute,
        } = await runSetup();

        const tiers = [1];
        const amounts = [2];

        const recipient1Address = initialRecipients[0].address;
        const recipient2Address = initialRecipients[1].address;

        const recipient1Split = initialRecipients[0].split; // in BPS
        const recipient2Split = initialRecipients[1].split; // in BPS

        const totalToDistribute = calculateTotalToDistribute(tiers, amounts);
        const expectedRecipient1Balance = totalToDistribute
          .mul(recipient1Split)
          .div(10000);
        const expectedRecipient2Balance = totalToDistribute
          .mul(recipient2Split)
          .div(10000);

        const previousRecipient1Balance = await VaultTokenContract.balanceOf(
          recipient1Address
        );
        const previousRecipient2Balance = await VaultTokenContract.balanceOf(
          recipient2Address
        );

        await LazyVaultContract.connect(distributor).distribute(
          tiers,
          amounts,
          [creator1.address]
        );

        const recipient1Balance = await VaultTokenContract.balanceOf(
          recipient1Address
        );
        const recipient2Balance = await VaultTokenContract.balanceOf(
          recipient2Address
        );

        // We expect the recipient's balance to be 2% of the total
        expect(recipient1Balance.sub(previousRecipient1Balance)).to.equal(
          expectedRecipient1Balance
        );
        // We expect this recipient's balance to be 5% of the total
        expect(recipient2Balance.sub(previousRecipient2Balance)).to.equal(
          expectedRecipient2Balance
        );
      });
      it("should correctly distribute the split to the recipients' addresses when there are multiple tiers", async function () {
        const {
          distributor,
          creator1,
          initialRecipients,
          LazyVaultContract,
          VaultTokenContract,
          calculateTotalToDistribute,
        } = await runSetup();

        const tiers = [1, 2];
        const amounts = [2, 3];

        const recipient1Address = initialRecipients[0].address;
        const recipient2Address = initialRecipients[1].address;

        const recipient1Split = initialRecipients[0].split; // in BPS
        const recipient2Split = initialRecipients[1].split; // in BPS

        const totalToDistribute = calculateTotalToDistribute(tiers, amounts);
        const expectedRecipient1Balance = totalToDistribute
          .mul(recipient1Split)
          .div(10000);
        const expectedRecipient2Balance = totalToDistribute
          .mul(recipient2Split)
          .div(10000);

        const previousRecipient1Balance = await VaultTokenContract.balanceOf(
          recipient1Address
        );
        const previousRecipient2Balance = await VaultTokenContract.balanceOf(
          recipient2Address
        );

        await LazyVaultContract.connect(distributor).distribute(
          tiers,
          amounts,
          [creator1.address, creator1.address]
        );

        const recipient1Balance = await VaultTokenContract.balanceOf(
          recipient1Address
        );
        const recipient2Balance = await VaultTokenContract.balanceOf(
          recipient2Address
        );

        // * UNCOMMENT BELOW TO SEE THE VALUES
        // console.log('totalToDistribute', formatEther(totalToDistribute));
        // console.log(
        //   'expectedRecipient1Balance',
        //   formatEther(expectedRecipient1Balance)
        // );
        // console.log(
        //   'expectedRecipient2Balance',
        //   formatEther(expectedRecipient2Balance)
        // );
        // console.log(
        //   'previousRecipient1Balance',
        //   formatEther(previousRecipient1Balance)
        // );
        // console.log(
        //   'previousRecipient2Balance',
        //   formatEther(previousRecipient2Balance)
        // );
        // console.log('recipient1Balance', formatEther(recipient1Balance));
        // console.log('recipient2Balance', formatEther(recipient2Balance));
        // * END UNCOMMENT

        // We expect the recipient's balance to be 2% of the total
        expect(recipient1Balance.sub(previousRecipient1Balance)).to.equal(
          expectedRecipient1Balance
        );
        // We expect this recipient's balance to be 5% of the total
        expect(recipient2Balance.sub(previousRecipient2Balance)).to.equal(
          expectedRecipient2Balance
        );
      });
      it("correctly distributes the creators' share to the creators' addresses", async function () {
        const {
          distributor,
          creator1,
          initialRecipients,
          LazyVaultContract,
          VaultTokenContract,
          calculateTotalToDistribute,
        } = await runSetup();

        const tiers = [1];
        const amounts = [2];

        const totalToDistribute = calculateTotalToDistribute(tiers, amounts);

        // deduct the split recipients' shares
        const splitRecipient1Amount = totalToDistribute
          .mul(initialRecipients[0].split)
          .div(10000);

        const splitRecipient2Amount = totalToDistribute
          .mul(initialRecipients[1].split)
          .div(10000);

        const totalToDistributeToCreator = totalToDistribute
          .sub(splitRecipient1Amount)
          .sub(splitRecipient2Amount);

        const previousCreator1Balance = await VaultTokenContract.balanceOf(
          creator1.address
        );

        await LazyVaultContract.connect(distributor).distribute(
          tiers,
          amounts,
          [creator1.address]
        );

        const creator1Balance = await VaultTokenContract.balanceOf(
          creator1.address
        );

        // We expect the creators balance to be the total amount minus the split recipients' shares
        expect(creator1Balance.sub(previousCreator1Balance)).to.equal(
          totalToDistributeToCreator
        );
      });
      it("correctly distributes the creators' share to the creators' addresses when there are multiple tiers but one creator", async function () {
        const {
          distributor,
          creator1,
          initialRecipients,
          LazyVaultContract,
          VaultTokenContract,
          calculateTotalToDistribute,
        } = await runSetup();

        const tiers = [1, 2];
        const amounts = [2, 3];

        const totalToDistribute = calculateTotalToDistribute(tiers, amounts);

        // deduct the split recipients' shares
        const splitRecipient1Amount = totalToDistribute
          .mul(initialRecipients[0].split)
          .div(10000);

        const splitRecipient2Amount = totalToDistribute
          .mul(initialRecipients[1].split)
          .div(10000);

        const totalToDistributeToCreator = totalToDistribute
          .sub(splitRecipient1Amount)
          .sub(splitRecipient2Amount);

        const previousCreator1Balance = await VaultTokenContract.balanceOf(
          creator1.address
        );

        await LazyVaultContract.connect(distributor).distribute(
          tiers,
          amounts,
          [creator1.address, creator1.address]
        );

        const creator1Balance = await VaultTokenContract.balanceOf(
          creator1.address
        );

        // We expect the creators balance to be the total amount minus the split recipients' shares
        expect(creator1Balance.sub(previousCreator1Balance)).to.equal(
          totalToDistributeToCreator
        );
      });
      it("correctly distributes the creators' share to the creators' addresses when there are multiple tiers and multiple creators", async function () {
        const {
          distributor,
          creator1,
          creator2,
          initialRecipients,
          LazyVaultContract,
          VaultTokenContract,
          calculateTotalToDistribute,
        } = await runSetup();

        const tiers = [1, 2];
        const amounts = [2, 3];

        const firstAssetTotal = calculateTotalToDistribute(
          [tiers[0]],
          [amounts[0]]
        );
        const secondAssetTotal = calculateTotalToDistribute(
          [tiers[1]],
          [amounts[1]]
        );

        // deduct the split recipients' shares
        const splitRecipient1Asset1Amount = firstAssetTotal
          .mul(initialRecipients[0].split)
          .div(10000);

        const splitRecipient2Asset1Amount = firstAssetTotal
          .mul(initialRecipients[1].split)
          .div(10000);

        const splitRecipient1Asset2Amount = secondAssetTotal
          .mul(initialRecipients[0].split)
          .div(10000);

        const splitRecipient2Asset2Amount = secondAssetTotal
          .mul(initialRecipients[1].split)
          .div(10000);

        const totalToDistributeToCreator1 = firstAssetTotal
          .sub(splitRecipient1Asset1Amount)
          .sub(splitRecipient2Asset1Amount);

        const totalToDistributeToCreator2 = secondAssetTotal
          .sub(splitRecipient1Asset2Amount)
          .sub(splitRecipient2Asset2Amount);

        const previousCreator1Balance = await VaultTokenContract.balanceOf(
          creator1.address
        );

        const previousCreator2Balance = await VaultTokenContract.balanceOf(
          creator2.address
        );

        await LazyVaultContract.connect(distributor).distribute(
          tiers,
          amounts,
          [creator1.address, creator2.address]
        );

        const creator1Balance = await VaultTokenContract.balanceOf(
          creator1.address
        );

        const creator2Balance = await VaultTokenContract.balanceOf(
          creator2.address
        );

        expect(creator1Balance.sub(previousCreator1Balance)).to.equal(
          totalToDistributeToCreator1
        );

        expect(creator2Balance.sub(previousCreator2Balance)).to.equal(
          totalToDistributeToCreator2
        );
      });
    });
    describe('Events', function () {
      it('should emit a Distribute event', async function () {
        const {
          distributor,
          creator1,
          initialTierValues,
          LazyVaultContract,
          calculateTotalToDistribute,
          initialRecipients,
        } = await runSetup();
        const tiers = [1];
        const amounts = [2];

        const totalToDistribute = calculateTotalToDistribute(tiers, amounts);

        const splitRecipient1Amount = totalToDistribute
          .mul(initialRecipients[0].split)
          .div(10000);

        const splitRecipient2Amount = totalToDistribute
          .mul(initialRecipients[1].split)
          .div(10000);

        const totalToDistributeToCreator = totalToDistribute
          .sub(splitRecipient1Amount)
          .sub(splitRecipient2Amount);

        await expect(
          LazyVaultContract.connect(distributor).distribute(tiers, amounts, [
            creator1.address,
          ])
        )
          .to.emit(LazyVaultContract, 'Distributed')
          .withArgs(
            tiers[0], // 1, not BigNumber because its uint8
            BigNumber.from(amounts[0]), // BigNumber.from(2)
            initialTierValues[tiers[0]], // BigNumber.from(100)
            creator1.address, // creator1.address
            [splitRecipient1Amount, splitRecipient2Amount], // BigNumber.from(200), BigNumber.from(500)
            [initialRecipients[0].address, initialRecipients[1].address], // initialRecipients[0].address, initialRecipients[1].address
            totalToDistributeToCreator
          );
      });
      it('should emit multiple Distribute events when there are multiple tiers', async function () {
        const {
          distributor,
          creator1,
          initialTierValues,
          LazyVaultContract,
          calculateTotalToDistribute,
          initialRecipients,
        } = await runSetup();
        const tiers = [1, 2];
        const amounts = [2, 3];

        const firstAssetTotal = calculateTotalToDistribute(
          [tiers[0]],
          [amounts[0]]
        );
        const secondAssetTotal = calculateTotalToDistribute(
          [tiers[1]],
          [amounts[1]]
        );

        // deduct the split recipients' shares
        const splitRecipient1Asset1Amount = firstAssetTotal
          .mul(initialRecipients[0].split)
          .div(10000);

        const splitRecipient2Asset1Amount = firstAssetTotal
          .mul(initialRecipients[1].split)
          .div(10000);

        const splitRecipient1Asset2Amount = secondAssetTotal
          .mul(initialRecipients[0].split)
          .div(10000);

        const splitRecipient2Asset2Amount = secondAssetTotal
          .mul(initialRecipients[1].split)
          .div(10000);

        const totalToDistributeToCreator1 = firstAssetTotal
          .sub(splitRecipient1Asset1Amount)
          .sub(splitRecipient2Asset1Amount);

        const totalToDistributeToCreator2 = secondAssetTotal
          .sub(splitRecipient1Asset2Amount)
          .sub(splitRecipient2Asset2Amount);

        const tx = await LazyVaultContract.connect(distributor).distribute(
          tiers,
          amounts,
          [creator1.address, creator1.address]
        );

        const receipt = await tx.wait();
        const events = (receipt.events as Event[]).filter(
          (event) => event.event === 'Distributed'
        );

        expect(events.length).to.equal(2);

        const expectedEventData = [
          {
            tier: tiers[0],
            amount: BigNumber.from(amounts[0]),
            tierValue: initialTierValues[tiers[0]],
            creator: creator1.address,
            splitAmounts: [
              splitRecipient1Asset1Amount,
              splitRecipient2Asset1Amount,
            ],
            splitRecipients: [
              initialRecipients[0].address,
              initialRecipients[1].address,
            ],
            totalToDistributeToCreator1,
          },
          {
            tier: tiers[1],
            amount: BigNumber.from(amounts[1]),
            tierValue: initialTierValues[tiers[1]],
            creator: creator1.address,
            splitAmounts: [
              splitRecipient1Asset2Amount,
              splitRecipient2Asset2Amount,
            ],
            splitRecipients: [
              initialRecipients[0].address,
              initialRecipients[1].address,
            ],
            totalToDistributeToCreator2,
          },
        ];

        for (let i = 0; i < events.length; i++) {
          const event = events[i];
          const expectedData = Object.values(expectedEventData[i]);
          const eventData = Object.values(
            event.args as unknown as (typeof expectedEventData)[0]
          );
          for (let j = 0; j < expectedData.length; j++) {
            expect(eventData[j]).to.deep.equal(expectedData[j]);
          }
        }
      });
    });
  });
});
