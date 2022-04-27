import {expect} from '../../../chai-setup';
import {ContributionRulesSetup} from '../fixtures/fixtures';

describe('ContributionRules', function () {
  describe('roles', function () {
    it('admin should be able to call setERC721MultiplierList', async function () {
      const {
        ERC721Token,
        contractAsAdmin,
        contract,
      } = await ContributionRulesSetup();
      await expect(
        contract.setERC721MultiplierList(ERC721Token.address, [10], [], true)
      ).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(
        contractAsAdmin.setERC721MultiplierList(
          ERC721Token.address,
          [10],
          [],
          true
        )
      ).not.to.be.reverted;
    });
    it('admin should be able to call setERC1155MultiplierList', async function () {
      const {
        ERC1155Token,
        contractAsAdmin,
        contract,
      } = await ContributionRulesSetup();
      await expect(
        contract.setERC1155MultiplierList(ERC1155Token.address, [10], [0])
      ).to.be.revertedWith('Ownable: caller is not the owner');
      await expect(
        contractAsAdmin.setERC1155MultiplierList(
          ERC1155Token.address,
          [10],
          [0]
        )
      ).not.to.be.reverted;
    });
    it('admin should be able to call deleteERC721MultiplierList', async function () {
      const {
        ERC721Token,
        contractAsAdmin,
        contract,
      } = await ContributionRulesSetup();

      await contractAsAdmin.setERC721MultiplierList(
        ERC721Token.address,
        [10],
        [],
        true
      );

      expect(
        await contract.isERC721MemberMultiplierList(ERC721Token.address)
      ).to.be.equal(true);

      await expect(
        contract.deleteERC721MultiplierList(ERC721Token.address)
      ).to.be.revertedWith('Ownable: caller is not the owner');

      await expect(
        contractAsAdmin.deleteERC721MultiplierList(ERC721Token.address)
      ).not.to.be.reverted;

      expect(
        await contract.isERC721MemberMultiplierList(ERC721Token.address)
      ).to.be.equal(false);
    });
    it('admin should be able to call deleteERC1155MultiplierList', async function () {
      const {
        ERC1155Token,
        contractAsAdmin,
        contract,
      } = await ContributionRulesSetup();

      await contractAsAdmin.setERC1155MultiplierList(
        ERC1155Token.address,
        [10],
        [1]
      );

      expect(
        await contract.isERC1155MemberMultiplierList(ERC1155Token.address)
      ).to.be.equal(true);

      await expect(
        contract.deleteERC1155MultiplierList(ERC1155Token.address)
      ).to.be.revertedWith('Ownable: caller is not the owner');

      await expect(
        contractAsAdmin.deleteERC1155MultiplierList(ERC1155Token.address)
      ).not.to.be.reverted;

      expect(
        await contract.isERC1155MemberMultiplierList(ERC1155Token.address)
      ).to.be.equal(false);
    });
    it('admin should be able to call setERC721MultiplierLimit', async function () {
      const {contractAsAdmin, contract} = await ContributionRulesSetup();

      const MAX_INT =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

      expect(await contract.multiplierLimitERC271()).to.be.equal(MAX_INT);

      await expect(contract.setERC721MultiplierLimit(30)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      );

      await expect(contractAsAdmin.setERC721MultiplierLimit(30)).not.to.be
        .reverted;

      expect(await contract.multiplierLimitERC271()).to.be.equal(30);
    });
    it('admin should be able to call setERC1155MultiplierLimit', async function () {
      const {contractAsAdmin, contract} = await ContributionRulesSetup();

      const MAX_INT =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

      expect(await contract.multiplierLimitERC1155()).to.be.equal(MAX_INT);

      await expect(contract.setERC1155MultiplierLimit(30)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      );

      await expect(contractAsAdmin.setERC1155MultiplierLimit(30)).not.to.be
        .reverted;

      expect(await contract.multiplierLimitERC1155()).to.be.equal(30);
    });
  });
  describe('compute contribution', function () {
    it('0 ERC721 - 0 ERC1155', async function () {
      const {
        contract,
        ERC721Token,
        ERC1155Token,
        other,
      } = await ContributionRulesSetup();
      expect(await ERC721Token.balanceOf(other)).to.be.equal(0);
      expect(await ERC1155Token.balanceOf(other, 0)).to.be.equal(0);
      expect(await contract.computeMultiplier(other, 1000)).to.be.equal(1000);
    });
    it('1 ERC721 balanceOf - 0 ERC1155', async function () {
      const {
        ERC721Token,
        ERC1155Token,
        contractAsAdmin,
        contract,
        other,
      } = await ContributionRulesSetup();

      const numERC721 = 1;

      await ERC721Token.setFakeBalance(other, numERC721);

      //no id and no multiplier - only multiplierLogarithm
      await contractAsAdmin.setERC721MultiplierList(
        ERC721Token.address,
        [],
        [],
        true
      );

      expect(await ERC721Token.balanceOf(other)).to.be.equal(numERC721);
      expect(await ERC1155Token.balanceOf(other, 0)).to.be.equal(0);
      expect(await contract.multiplierBalanceOfERC721(other)).to.be.equal(10);
      expect(await contract.computeMultiplier(other, 1000)).to.be.equal(1100);
    });
    it('4 ERC721 balanceOf - 0 ERC1155', async function () {
      const {
        ERC721Token,
        ERC1155Token,
        contractAsAdmin,
        contract,
        other,
      } = await ContributionRulesSetup();

      const numERC721 = 4;

      await ERC721Token.setFakeBalance(other, numERC721);

      //no id and no multiplier - only multiplierLogarithm
      await contractAsAdmin.setERC721MultiplierList(
        ERC721Token.address,
        [],
        [],
        true
      );

      expect(await ERC721Token.balanceOf(other)).to.be.equal(numERC721);
      expect(await ERC1155Token.balanceOf(other, 0)).to.be.equal(0);
      expect(await contract.multiplierBalanceOfERC721(other)).to.be.equal(21);
      expect(await contract.computeMultiplier(other, 1000)).to.be.equal(1210);
    });
    it('1 ERC721 balanceOf - 1 ERC1155', async function () {
      const {
        ERC721Token,
        ERC1155Token,
        contractAsAdmin,
        contract,
        other,
      } = await ContributionRulesSetup();

      const id = '0x123456';

      const numERC721 = 1;
      const numERC1155 = 1;

      await ERC721Token.setFakeBalance(other, numERC721);
      await ERC1155Token.setFakeBalance(other, id, numERC1155);

      //no id and no multiplier - only multiplierLogarithm
      await contractAsAdmin.setERC721MultiplierList(
        ERC721Token.address,
        [],
        [],
        true
      );

      await contractAsAdmin.setERC1155MultiplierList(
        ERC1155Token.address,
        [id],
        [10] // 10%
      );

      expect(await ERC721Token.balanceOf(other)).to.be.equal(numERC721);
      expect(await ERC1155Token.balanceOf(other, id)).to.be.equal(numERC1155);
      expect(await contract.multiplierBalanceOfERC721(other)).to.be.equal(10);
      expect(await contract.multiplierBalanceOfERC1155(other)).to.be.equal(10);
      expect(await contract.computeMultiplier(other, 1000)).to.be.equal(1200);
    });
    it('1 ERC721 balanceOf - 2 ERC1155 ids', async function () {
      const {
        ERC721Token,
        ERC1155Token,
        contractAsAdmin,
        contract,
        other,
      } = await ContributionRulesSetup();

      const id1 = '0x123456';
      const id2 = '0x789012';

      const numERC721 = 1;
      const numERC1155 = 1;

      await ERC721Token.setFakeBalance(other, numERC721);
      await ERC1155Token.setFakeBalance(other, id1, numERC1155);
      await ERC1155Token.setFakeBalance(other, id2, numERC1155);

      //no id and no multiplier - only multiplierLogarithm
      await contractAsAdmin.setERC721MultiplierList(
        ERC721Token.address,
        [],
        [],
        true
      );

      await contractAsAdmin.setERC1155MultiplierList(
        ERC1155Token.address,
        [id1, id2],
        [10, 5] // 10%, 5%
      );

      expect(await ERC721Token.balanceOf(other)).to.be.equal(numERC721);
      expect(await ERC1155Token.balanceOf(other, id1)).to.be.equal(numERC1155);
      expect(await ERC1155Token.balanceOf(other, id2)).to.be.equal(numERC1155);
      expect(await contract.multiplierBalanceOfERC721(other)).to.be.equal(10);
      expect(await contract.multiplierBalanceOfERC1155(other)).to.be.equal(15);
      expect(await contract.computeMultiplier(other, 1000)).to.be.equal(1250);
    });
    it('1 ERC721 id - 2 ERC1155 ids', async function () {
      const {
        ERC721Token,
        ERC1155Token,
        contractAsAdmin,
        contract,
        other,
      } = await ContributionRulesSetup();

      const id1 = '0x123456';
      const id2 = '0x789012';

      const numERC1155 = 1;

      await ERC721Token.mint(other, id1);
      await ERC1155Token.setFakeBalance(other, id1, numERC1155);
      await ERC1155Token.setFakeBalance(other, id2, numERC1155);

      await contractAsAdmin.setERC721MultiplierList(
        ERC721Token.address,
        [id1],
        [5], // 5%
        false
      );

      await contractAsAdmin.setERC1155MultiplierList(
        ERC1155Token.address,
        [id1, id2],
        [10, 5] // 10%, 5%
      );

      expect(await ERC721Token.ownerOf(id1)).to.be.equal(other);
      expect(await ERC1155Token.balanceOf(other, id1)).to.be.equal(numERC1155);
      expect(await ERC1155Token.balanceOf(other, id2)).to.be.equal(numERC1155);
      expect(await contract.multiplierBalanceOfERC721(other)).to.be.equal(5);
      expect(await contract.multiplierBalanceOfERC1155(other)).to.be.equal(15);
      expect(await contract.computeMultiplier(other, 1000)).to.be.equal(1200);
    });
    it('2 ERC721 ids - 2 ERC1155 ids', async function () {
      const {
        ERC721Token,
        ERC1155Token,
        contractAsAdmin,
        contract,
        other,
      } = await ContributionRulesSetup();

      const id1 = '0x123456';
      const id2 = '0x789012';

      const numERC1155 = 1;

      await ERC721Token.mint(other, id1);
      await ERC721Token.mint(other, id2);
      await ERC1155Token.setFakeBalance(other, id1, numERC1155);
      await ERC1155Token.setFakeBalance(other, id2, numERC1155);

      await contractAsAdmin.setERC721MultiplierList(
        ERC721Token.address,
        [id1, id2],
        [7, 3], // 7%, 3%
        false
      );

      await contractAsAdmin.setERC1155MultiplierList(
        ERC1155Token.address,
        [id1, id2],
        [10, 5] // 10%, 5%
      );

      expect(await ERC721Token.ownerOf(id1)).to.be.equal(other);
      expect(await ERC721Token.ownerOf(id2)).to.be.equal(other);
      expect(await ERC1155Token.balanceOf(other, id1)).to.be.equal(numERC1155);
      expect(await ERC1155Token.balanceOf(other, id2)).to.be.equal(numERC1155);
      expect(await contract.multiplierBalanceOfERC721(other)).to.be.equal(10);
      expect(await contract.multiplierBalanceOfERC1155(other)).to.be.equal(15);
      expect(await contract.computeMultiplier(other, 1000)).to.be.equal(1250);
    });
  });
  describe('multiplier limit', function () {
    it('should limit ERC721 multiplier at 15%', async function () {
      const {
        ERC721Token,
        contractAsAdmin,
        contract,
        other,
      } = await ContributionRulesSetup();

      const numERC721 = 2; // 17%

      await ERC721Token.setFakeBalance(other, numERC721);

      contractAsAdmin.setERC721MultiplierLimit(15);

      //no id and no multiplier - only multiplierLogarithm
      await contractAsAdmin.setERC721MultiplierList(
        ERC721Token.address,
        [],
        [],
        true
      );
      // user should have multiplier of 17%
      expect(await contract.multiplierBalanceOfERC721(other)).to.be.equal(17);
      // multiplier should be capped at 15% - and not 17%
      expect(await contract.computeMultiplier(other, 1000)).to.be.equal(1150);

      await ERC721Token.setFakeBalance(other, 1); //10%
      // user should have multiplier of 10%
      expect(await contract.multiplierBalanceOfERC721(other)).to.be.equal(10);
      // as 10 <= 15, multiplier of 10% should be applied
      expect(await contract.computeMultiplier(other, 1000)).to.be.equal(1100);
    });
    it('should limit ERC1155 multiplier at 15%', async function () {
      const {
        ERC1155Token,
        contractAsAdmin,
        contract,
        other,
      } = await ContributionRulesSetup();

      const numERC1155 = 1; // 17%

      const id = '0x123456';

      await ERC1155Token.setFakeBalance(other, id, numERC1155);

      contractAsAdmin.setERC1155MultiplierLimit(15);

      await contractAsAdmin.setERC1155MultiplierList(
        ERC1155Token.address,
        [id],
        [20] // 20%
      );

      expect(await contract.multiplierBalanceOfERC1155(other)).to.be.equal(20);
      // multiplier should be capped at 15% - and not 20%
      expect(await contract.computeMultiplier(other, 1000)).to.be.equal(1150);

      await contractAsAdmin.setERC1155MultiplierList(
        ERC1155Token.address,
        [id],
        [14] // 14%
      );
      // user should have multiplier of 14%
      expect(await contract.multiplierBalanceOfERC1155(other)).to.be.equal(14);
      // as 10 <= 15, multiplier of 10% should be applied
      expect(await contract.computeMultiplier(other, 1000)).to.be.equal(1140);
    });
    it('should return MaxGlobalMultiplier', async function () {
      const {
        ERC1155Token,
        ERC721Token,
        contractAsAdmin,
        contract,
        other,
      } = await ContributionRulesSetup();

      const numERC721 = 1; // 10%
      const numERC1155 = 1;

      const id = '0x123456';

      await ERC721Token.setFakeBalance(other, numERC721);
      await ERC1155Token.setFakeBalance(other, id, numERC1155);

      await contractAsAdmin.setERC721MultiplierList(
        ERC721Token.address,
        [],
        [],
        true
      );

      await contractAsAdmin.setERC1155MultiplierList(
        ERC1155Token.address,
        [id],
        [20] // 20%
      );

      expect(await contract.getMaxGlobalMultiplier(other)).to.be.equal(30);
    });
  });
});
