import {expect} from '../../../chai-setup';
import {setupERC20RewardPoolTest} from '../fixtures/fixtures';

describe('Requirementsules', function () {
  describe('roles', function () {
    it('admin should be able to call setMaxStakeOverall', async function () {
      const {contract, contractAsOther} = await setupERC20RewardPoolTest();
      await expect(contractAsOther.setMaxStakeOverall(100)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      );
      await expect(contract.setMaxStakeOverall(100)).not.to.be.reverted;
      expect(await contract.maxStakeOverall()).to.be.equal(100);
    });
    it('admin should be able to call setERC721RequirementList', async function () {
      const {
        contract,
        contractAsOther,
        ERC721Token,
      } = await setupERC20RewardPoolTest();

      const id = '0x123456';

      await expect(
        contractAsOther.setERC721RequirementList(
          ERC721Token.address,
          [id],
          false,
          5,
          10,
          5,
          10
        )
      ).to.be.revertedWith('Ownable: caller is not the owner');

      await expect(
        contract.setERC721RequirementList(
          ERC721Token.address,
          [id],
          false,
          5,
          10,
          5,
          10
        )
      ).not.to.be.reverted;
    });
    it('admin should be able to call setERC1155RequirementList', async function () {
      const {
        contract,
        contractAsOther,
        ERC1155Token,
      } = await setupERC20RewardPoolTest();

      const id = '0x123456';

      await expect(
        contractAsOther.setERC1155RequirementList(
          ERC1155Token.address,
          [id],
          5,
          10
        )
      ).to.be.revertedWith('Ownable: caller is not the owner');

      await expect(
        contract.setERC1155RequirementList(ERC1155Token.address, [id], 5, 10)
      ).not.to.be.reverted;
    });
    it('admin should be able to call deleteERC721RequirementList', async function () {
      const {
        ERC721Token,
        contractAsOther,
        contract,
      } = await setupERC20RewardPoolTest();

      const id = '0x123456';

      await contract.setERC721RequirementList(
        ERC721Token.address,
        [id],
        false,
        5,
        10,
        5,
        10
      );

      expect(
        await contract.isERC721MemberRequirementList(ERC721Token.address)
      ).to.be.equal(true);

      await expect(
        contractAsOther.deleteERC721RequirementList(ERC721Token.address)
      ).to.be.revertedWith('Ownable: caller is not the owner');

      await expect(contract.deleteERC721RequirementList(ERC721Token.address))
        .not.to.be.reverted;

      expect(
        await contract.isERC721MemberRequirementList(ERC721Token.address)
      ).to.be.equal(false);
    });
    it('admin should be able to call deleteERC1155RequirementList', async function () {
      const {
        ERC1155Token,
        contractAsOther,
        contract,
      } = await setupERC20RewardPoolTest();

      const id = '0x123456';

      await contract.setERC1155RequirementList(
        ERC1155Token.address,
        [id],
        5,
        10
      );

      expect(
        await contract.isERC1155MemberRequirementList(ERC1155Token.address)
      ).to.be.equal(true);

      await expect(
        contractAsOther.deleteERC1155RequirementList(ERC1155Token.address)
      ).to.be.revertedWith('Ownable: caller is not the owner');

      await expect(contract.deleteERC1155RequirementList(ERC1155Token.address))
        .not.to.be.reverted;

      expect(
        await contract.isERC1155MemberRequirementList(ERC1155Token.address)
      ).to.be.equal(false);
    });
  });
  describe('Max/Min Stake', function () {
    it('getERC721MaxStake should return correct values - balanceOf', async function () {
      const {ERC721Token, contract, getUser} = await setupERC20RewardPoolTest();

      const numERC721 = 1;

      const user = await getUser();

      await ERC721Token.setFakeBalance(user.address, numERC721);

      contract.setMaxStakeOverall(100);

      await contract.setERC721RequirementList(
        ERC721Token.address,
        [],
        true,
        5,
        10,
        0,
        0
      );

      const maxStake = await contract.getERC721MaxStake(user.address);

      expect(maxStake).to.be.equal(10);
    });
    it('getERC721MaxStake should return correct values - id', async function () {
      const {ERC721Token, contract, getUser} = await setupERC20RewardPoolTest();

      const id = '0x123456';

      const user = await getUser();

      await ERC721Token.mint(user.address, id);

      contract.setMaxStakeOverall(100);

      await contract.setERC721RequirementList(
        ERC721Token.address,
        [id],
        false,
        0,
        0,
        5,
        8
      );

      const maxStake = await contract.getERC721MaxStake(user.address);

      expect(maxStake).to.be.equal(8);
    });
    it('getERC721MaxStake should return correct values - id & balanceOf', async function () {
      const {ERC721Token, contract, getUser} = await setupERC20RewardPoolTest();

      const id = '0x123456';
      const numERC721 = 1;

      const user = await getUser();

      await ERC721Token.mint(user.address, id);
      await ERC721Token.setFakeBalance(user.address, numERC721);

      contract.setMaxStakeOverall(100);

      await contract.setERC721RequirementList(
        ERC721Token.address,
        [],
        true,
        1,
        5,
        5,
        8 // should disconsider id as balanceOf = true
      );

      const maxStake = await contract.getERC721MaxStake(user.address);

      expect(maxStake).to.be.equal(5);
    });
    it('checkERC721MinStake should fail - balanceOf', async function () {
      const {
        ERC721Token,
        ERC1155Token,
        contract,
        getUser,
      } = await setupERC20RewardPoolTest();

      const numERC721 = 1;

      const user = await getUser();

      await ERC721Token.setFakeBalance(user.address, numERC721);

      await contract.setERC721RequirementList(
        ERC721Token.address,
        [],
        true,
        5,
        10,
        0,
        0
      );

      const id = '0x123456';
      const numERC1155 = 1;

      await ERC1155Token.setFakeBalance(user.address, id, numERC1155);

      contract.setMaxStakeOverall(100);

      await contract.setERC1155RequirementList(
        ERC1155Token.address,
        [id],
        5,
        12
      );

      const maxStake = await contract.getERC1155MaxStake(user.address);

      expect(maxStake).to.be.equal(12);
    });
    it('checkERC721MaxStake should return correct value', async function () {
      const {
        ERC721TokenArray,
        contract,
        getUser,
      } = await setupERC20RewardPoolTest();

      const numERC721 = 1;

      const user = await getUser();

      await ERC721TokenArray[0].setFakeBalance(user.address, numERC721);
      await ERC721TokenArray[1].setFakeBalance(user.address, numERC721);

      await contract.setERC721RequirementList(
        ERC721TokenArray[0].address,
        [],
        true,
        1,
        10,
        0,
        0
      );

      let maxStake = await contract.checkAndGetERC721Stake(user.address);

      expect(maxStake).to.be.equal(10);

      await contract.setERC721RequirementList(
        ERC721TokenArray[1].address,
        [],
        true,
        1,
        5,
        0,
        0
      );

      maxStake = await contract.checkAndGetERC721Stake(user.address);

      expect(maxStake).to.be.equal(15);
    });
    it('checkERC1155MaxStake should return correct value', async function () {
      const {
        ERC1155TokenArray,
        contract,
        getUser,
      } = await setupERC20RewardPoolTest();

      const user = await getUser();

      const id = '0x123456';
      const numERC1155 = 1;

      await ERC1155TokenArray[0].setFakeBalance(user.address, id, numERC1155);
      await ERC1155TokenArray[1].setFakeBalance(user.address, id, numERC1155);

      await contract.setERC1155RequirementList(
        ERC1155TokenArray[0].address,
        [id],
        1,
        12
      );

      let maxStake = await contract.checkAndGetERC1155Stake(user.address);

      expect(maxStake).to.be.equal(12);

      await contract.setERC1155RequirementList(
        ERC1155TokenArray[1].address,
        [id],
        1,
        5
      );

      maxStake = await contract.checkAndGetERC1155Stake(user.address);

      expect(maxStake).to.be.equal(17);
    });
  });
  describe('Max Stake Calculator', function () {
    it('ERC721 balanceOf and ERC1155', async function () {
      const {
        ERC1155Token,
        ERC721Token,
        contract,
        getUser,
      } = await setupERC20RewardPoolTest();

      const id = '0x123456';
      const numERC1155 = 1;

      const user = await getUser();

      await ERC1155Token.setFakeBalance(user.address, id, numERC1155);

      contract.setMaxStakeOverall(100);

      await contract.setERC1155RequirementList(
        ERC1155Token.address,
        [id],
        1,
        12 // 12
      );

      const numERC721 = 6;

      await ERC721Token.setFakeBalance(user.address, numERC721);

      await contract.setERC721RequirementList(
        ERC721Token.address,
        [],
        true,
        5,
        10, // 6 * 10 = 60
        0,
        0
      );

      const maxStake = await contract.maxStakeAllowedCalculator(user.address);

      expect(maxStake).to.be.equal(72); // 60 + 12
    });
    it('ERC721 balanceOf and No ERC1155', async function () {
      const {
        ERC1155Token,
        ERC721Token,
        contract,
        getUser,
      } = await setupERC20RewardPoolTest();

      const id = '0x123456';
      const numERC1155 = 1;

      const user = await getUser();

      await ERC1155Token.setFakeBalance(user.address, id, numERC1155);

      contract.setMaxStakeOverall(100);

      // don't have the min required
      await contract.setERC1155RequirementList(
        ERC1155Token.address,
        [id],
        3,
        12 // 0
      );

      const numERC721 = 6;

      await ERC721Token.setFakeBalance(user.address, numERC721);

      await contract.setERC721RequirementList(
        ERC721Token.address,
        [],
        true,
        5,
        10, // 6 * 10 = 60
        0,
        0
      );

      const maxStake = await contract.maxStakeAllowedCalculator(user.address);

      expect(maxStake).to.be.equal(72); // 60 + 0
    });
    it('ERC721 balanceId and ERC1155', async function () {
      const {
        ERC1155Token,
        ERC721Token,
        contract,
        getUser,
      } = await setupERC20RewardPoolTest();

      const id = '0x123456';
      const numERC1155 = 1;

      const user = await getUser();

      await ERC1155Token.setFakeBalance(user.address, id, numERC1155);

      contract.setMaxStakeOverall(100);

      await contract.setERC1155RequirementList(
        ERC1155Token.address,
        [id],
        1,
        12 // 12
      );

      await ERC721Token.mint(user.address, id);

      await contract.setERC721RequirementList(
        ERC721Token.address,
        [id],
        false,
        0,
        0,
        1,
        20 // 1 * 10 = 20
      );

      const maxStake = await contract.maxStakeAllowedCalculator(user.address);

      expect(maxStake).to.be.equal(32); // 20 + 12
    });
    it('No ERC721 and ERC1155', async function () {
      const {
        ERC1155Token,
        ERC721Token,
        contract,
        getUser,
      } = await setupERC20RewardPoolTest();

      const id = '0x123456';
      const numERC1155 = 1;

      const user = await getUser();

      await ERC1155Token.setFakeBalance(user.address, id, numERC1155);

      contract.setMaxStakeOverall(100);

      await contract.setERC1155RequirementList(
        ERC1155Token.address,
        [id],
        1,
        12 // 12
      );

      // mint the token, but not for the user
      await ERC721Token.mint(contract.address, id);

      await contract.setERC721RequirementList(
        ERC721Token.address,
        [id],
        false,
        0,
        0,
        5,
        10 // 0
      );

      const maxStake = await contract.maxStakeAllowedCalculator(user.address);

      expect(maxStake).to.be.equal(12); // 0 + 12
    });
    it('maxStakeOverall should cap maxStake', async function () {
      const {
        ERC1155Token,
        ERC721Token,
        contract,
        getUser,
      } = await setupERC20RewardPoolTest();

      const id = '0x123456';
      const numERC1155 = 1;

      const user = await getUser();

      await ERC1155Token.setFakeBalance(user.address, id, numERC1155);

      contract.setMaxStakeOverall(20);

      await contract.setERC1155RequirementList(
        ERC1155Token.address,
        [id],
        1,
        12 // 12
      );

      await ERC721Token.mint(user.address, id);

      await contract.setERC721RequirementList(
        ERC721Token.address,
        [id],
        false,
        0,
        0,
        5,
        30 // 30
      );

      const maxStake = await contract.maxStakeAllowedCalculator(user.address);

      expect(maxStake).to.be.equal(20); // 30 + 12 > 20 (maxStakeOverall)
    });
  });
  describe('Stake', function () {
    it('user should be able to stake', async function () {
      const {
        ERC1155Token,
        ERC721Token,
        contract,
        getUser,
      } = await setupERC20RewardPoolTest();

      const id = '0x123456';
      const numERC1155 = 1;

      const user = await getUser();

      await ERC1155Token.setFakeBalance(user.address, id, numERC1155);

      contract.setMaxStakeOverall(100);

      await contract.setERC1155RequirementList(
        ERC1155Token.address,
        [id],
        1,
        12 // 12
      );

      await ERC721Token.mint(user.address, id);

      await contract.setERC721RequirementList(
        ERC721Token.address,
        [id],
        false,
        0,
        0,
        1,
        30 // 30
      );

      await expect(user.pool.stake(20)).not.to.be.reverted;
    });
    it('stake should fail - ERC721 balanceId ', async function () {
      const {
        ERC1155Token,
        ERC721Token,
        contract,
        getUser,
      } = await setupERC20RewardPoolTest();

      const id = '0x123456';
      const numERC1155 = 1;

      const user = await getUser();

      await ERC1155Token.setFakeBalance(user.address, id, numERC1155);

      await contract.setERC1155RequirementList(
        ERC1155Token.address,
        [id],
        1,
        12 // 12
      );

      await ERC721Token.mint(user.address, id);

      // don't have the min required
      await contract.setERC721RequirementList(
        ERC721Token.address,
        [id],
        false,
        0,
        0,
        5,
        30 // 30
      );

      await expect(user.pool.stake(20)).to.be.revertedWith(
        'RequirementsRules: balanceId'
      );
    });
    it('stake should fail - ERC721 balanceOf ', async function () {
      const {
        ERC1155Token,
        ERC721Token,
        contract,
        getUser,
      } = await setupERC20RewardPoolTest();

      const id = '0x123456';
      const numERC1155 = 1;

      const user = await getUser();

      await ERC1155Token.setFakeBalance(user.address, id, numERC1155);

      await contract.setERC1155RequirementList(
        ERC1155Token.address,
        [id],
        1,
        12 // 12
      );
      const numERC721 = 1;
      await ERC721Token.setFakeBalance(user.address, numERC721);

      // don't have the min required
      await contract.setERC721RequirementList(
        ERC721Token.address,
        [],
        true,
        5,
        10,
        0,
        0 // 30
      );

      await expect(user.pool.stake(20)).to.be.revertedWith(
        'RequirementsRules: balanceOf'
      );
    });
    it('stake should fail - ERC1155 balanceId ', async function () {
      const {
        ERC1155Token,
        ERC721Token,
        contract,
        getUser,
      } = await setupERC20RewardPoolTest();

      const id = '0x123456';
      const numERC1155 = 1;

      const user = await getUser();

      await ERC1155Token.setFakeBalance(user.address, id, numERC1155);

      contract.setMaxStakeOverall(100);

      // don't have the min required
      await contract.setERC1155RequirementList(
        ERC1155Token.address,
        [id],
        4,
        12 // 12
      );
      const numERC721 = 6;
      await ERC721Token.setFakeBalance(user.address, numERC721);

      await contract.setERC721RequirementList(
        ERC721Token.address,
        [],
        true,
        1,
        10,
        0,
        0 // 30
      );

      await expect(user.pool.stake(20)).to.be.revertedWith(
        'RequirementsRules: balanceId'
      );
    });
    it('stake should fail - maxAllowed ', async function () {
      const {
        ERC1155Token,
        ERC721Token,
        contract,
        getUser,
      } = await setupERC20RewardPoolTest();

      const id = '0x123456';
      const numERC1155 = 1;

      const user = await getUser();

      await ERC1155Token.setFakeBalance(user.address, id, numERC1155);

      contract.setMaxStakeOverall(100);

      await contract.setERC1155RequirementList(
        ERC1155Token.address,
        [id],
        1,
        12 // 12
      );
      const numERC721 = 6;
      await ERC721Token.setFakeBalance(user.address, numERC721);

      await contract.setERC721RequirementList(
        ERC721Token.address,
        [],
        true,
        1,
        10,
        0,
        0 // 30
      );

      await expect(user.pool.stake(200)).to.be.revertedWith(
        'RequirementsRules: maxAllowed'
      );
    });
  });
});
