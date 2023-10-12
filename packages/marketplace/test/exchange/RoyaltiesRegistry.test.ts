import {deployFixtures} from '../fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {expect} from 'chai';
import {ZeroAddress} from 'ethers';

describe('RoyaltiesRegistry.sol', function () {
  it('should not set provider by token if caller is not owner', async function () {
    const {ERC721WithRoyaltyV2981, RoyaltiesRegistryAsUser, user1} =
      await loadFixture(deployFixtures);

    await expect(
      RoyaltiesRegistryAsUser.setProviderByToken(
        await ERC721WithRoyaltyV2981.getAddress(),
        user1.address
      )
    ).to.be.revertedWith('Token owner not detected');
  });

  it('should set provider by token', async function () {
    const {RoyaltiesRegistryAsDeployer, ERC721WithRoyaltyV2981, user1} =
      await loadFixture(deployFixtures);

    expect(
      await RoyaltiesRegistryAsDeployer.royaltiesProviders(
        await ERC721WithRoyaltyV2981.getAddress()
      )
    ).to.be.equal(ZeroAddress);
    await RoyaltiesRegistryAsDeployer.setProviderByToken(
      await ERC721WithRoyaltyV2981.getAddress(),
      user1.address
    );
    expect(
      await RoyaltiesRegistryAsDeployer.royaltiesProviders(
        await ERC721WithRoyaltyV2981.getAddress()
      )
    ).to.not.be.equal(ZeroAddress);
  });

  it('should return provider address', async function () {
    const {RoyaltiesRegistryAsDeployer, ERC721WithRoyaltyV2981, user1} =
      await loadFixture(deployFixtures);

    await RoyaltiesRegistryAsDeployer.setProviderByToken(
      await ERC721WithRoyaltyV2981.getAddress(),
      user1.address
    );
    expect(
      await RoyaltiesRegistryAsDeployer.getProvider(
        await ERC721WithRoyaltyV2981.getAddress()
      )
    ).to.be.equal(user1.address);
  });

  it('should return default royalty type for unset provider', async function () {
    const {RoyaltiesRegistryAsDeployer, ERC721WithRoyaltyV2981} =
      await loadFixture(deployFixtures);

    // ROYALTIES_TYPE_UNSET = 0
    expect(
      await RoyaltiesRegistryAsDeployer.getRoyaltiesType(
        await ERC721WithRoyaltyV2981.getAddress()
      )
    ).to.be.equal(0);
  });

  it('should return royalty type', async function () {
    const {RoyaltiesRegistryAsDeployer, ERC721WithRoyaltyV2981, user1} =
      await loadFixture(deployFixtures);

    await RoyaltiesRegistryAsDeployer.setProviderByToken(
      await ERC721WithRoyaltyV2981.getAddress(),
      user1.address
    );
    // ROYALTIES_TYPE_EXTERNAL_PROVIDER = 2
    expect(
      await RoyaltiesRegistryAsDeployer.getRoyaltiesType(
        await ERC721WithRoyaltyV2981.getAddress()
      )
    ).to.be.equal(2);
  });

  it('should not force set royalties type if caller is not owner', async function () {
    const {RoyaltiesRegistryAsUser, ERC721WithRoyaltyV2981} = await loadFixture(
      deployFixtures
    );

    await expect(
      RoyaltiesRegistryAsUser.forceSetRoyaltiesType(
        await ERC721WithRoyaltyV2981.getAddress(),
        1
      )
    ).to.be.revertedWith('Token owner not detected');
  });

  it('should not force set an invalid royalties type', async function () {
    const {RoyaltiesRegistryAsDeployer, ERC721WithRoyaltyV2981} =
      await loadFixture(deployFixtures);

    await expect(
      RoyaltiesRegistryAsDeployer.forceSetRoyaltiesType(
        await ERC721WithRoyaltyV2981.getAddress(),
        5
      )
    ).to.be.revertedWithoutReason();
  });

  it('should be able to force set royalties type', async function () {
    const {RoyaltiesRegistryAsDeployer, ERC721WithRoyaltyV2981} =
      await loadFixture(deployFixtures);

    expect(
      await RoyaltiesRegistryAsDeployer.getRoyaltiesType(
        await ERC721WithRoyaltyV2981.getAddress()
      )
    ).to.be.equal(0);
    await RoyaltiesRegistryAsDeployer.forceSetRoyaltiesType(
      await ERC721WithRoyaltyV2981.getAddress(),
      4
    );
    expect(
      await RoyaltiesRegistryAsDeployer.getRoyaltiesType(
        await ERC721WithRoyaltyV2981.getAddress()
      )
    ).to.be.equal(4);
  });

  it('should not clear royalties type if caller is not owner', async function () {
    const {
      RoyaltiesRegistryAsUser,
      RoyaltiesRegistryAsDeployer,
      ERC721WithRoyaltyV2981,
    } = await loadFixture(deployFixtures);

    await RoyaltiesRegistryAsDeployer.forceSetRoyaltiesType(
      await ERC721WithRoyaltyV2981.getAddress(),
      1
    );
    expect(
      await RoyaltiesRegistryAsDeployer.getRoyaltiesType(
        await ERC721WithRoyaltyV2981.getAddress()
      )
    ).to.be.equal(1);
    await expect(
      RoyaltiesRegistryAsUser.clearRoyaltiesType(
        await ERC721WithRoyaltyV2981.getAddress()
      )
    ).to.be.revertedWith('Token owner not detected');
  });

  it('should clear royalties type', async function () {
    const {RoyaltiesRegistryAsDeployer, ERC721WithRoyaltyV2981} =
      await loadFixture(deployFixtures);

    await RoyaltiesRegistryAsDeployer.forceSetRoyaltiesType(
      await ERC721WithRoyaltyV2981.getAddress(),
      1
    );
    expect(
      await RoyaltiesRegistryAsDeployer.getRoyaltiesType(
        await ERC721WithRoyaltyV2981.getAddress()
      )
    ).to.be.equal(1);
    await RoyaltiesRegistryAsDeployer.clearRoyaltiesType(
      await ERC721WithRoyaltyV2981.getAddress()
    );
    expect(
      await RoyaltiesRegistryAsDeployer.getRoyaltiesType(
        await ERC721WithRoyaltyV2981.getAddress()
      )
    ).to.be.equal(0);
  });

  it('should not set royalties by token if caller is not owner', async function () {
    const {RoyaltiesRegistryAsUser, ERC721WithRoyaltyV2981, user1} =
      await loadFixture(deployFixtures);
    const part = {
      account: user1.address,
      value: 1,
    };
    const royalties = [part];
    await expect(
      RoyaltiesRegistryAsUser.setRoyaltiesByToken(
        await ERC721WithRoyaltyV2981.getAddress(),
        royalties
      )
    ).to.be.revertedWith('Token owner not detected');
  });

  it('should not set royalties with token with a zero address recipient', async function () {
    const {RoyaltiesRegistryAsDeployer, ERC721WithRoyaltyV2981} =
      await loadFixture(deployFixtures);
    const part = {
      account: ZeroAddress,
      value: 1,
    };
    const royalties = [part];
    await expect(
      RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
        await ERC721WithRoyaltyV2981.getAddress(),
        royalties
      )
    ).to.be.revertedWith('RoyaltiesByToken recipient should be present');
  });

  it('should not set royalties with token with invalid royalty value', async function () {
    const {RoyaltiesRegistryAsDeployer, ERC721WithRoyaltyV2981, user1} =
      await loadFixture(deployFixtures);
    const part = {
      account: user1.address,
      value: 0,
    };
    const royalties = [part];
    await expect(
      RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
        await ERC721WithRoyaltyV2981.getAddress(),
        royalties
      )
    ).to.be.revertedWith('Royalty value for RoyaltiesByToken should be > 0');
  });

  it('should not set royalties with token when setting royalties exceeding 100%', async function () {
    const {RoyaltiesRegistryAsDeployer, ERC721WithRoyaltyV2981, user1, user2} =
      await loadFixture(deployFixtures);
    const part1 = {
      account: user1.address,
      value: 5000,
    };
    const part2 = {
      account: user2.address,
      value: 5000,
    };
    const royalties = [part1, part2];
    await expect(
      RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
        await ERC721WithRoyaltyV2981.getAddress(),
        royalties
      )
    ).to.be.revertedWith('Set by token royalties sum more, than 100%');
  });

  it('should set royalties by token', async function () {
    const {RoyaltiesRegistryAsDeployer, ERC721WithRoyaltyV2981, user1} =
      await loadFixture(deployFixtures);
    const part = {
      account: user1.address,
      value: 1,
    };
    const royalties = [part];
    await expect(
      RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
        await ERC721WithRoyaltyV2981.getAddress(),
        royalties
      )
    ).to.emit(RoyaltiesRegistryAsDeployer, 'RoyaltiesSetForContract');
  });

  it('should updates royaltiesType for unset token with getRoyalties', async function () {
    const {RoyaltiesRegistryAsUser, ERC721WithRoyaltyV2981} = await loadFixture(
      deployFixtures
    );
    expect(
      await RoyaltiesRegistryAsUser.getRoyaltiesType(
        await ERC721WithRoyaltyV2981.getAddress()
      )
    ).to.be.equal(0);

    await RoyaltiesRegistryAsUser.getRoyalties(
      await ERC721WithRoyaltyV2981.getAddress(),
      1
    );
    expect(
      await RoyaltiesRegistryAsUser.getRoyaltiesType(
        await ERC721WithRoyaltyV2981.getAddress()
      )
    ).to.be.equal(3);
  });

  it('should getRoyalties for token with royaltiesType 1', async function () {
    const {
      RoyaltiesRegistryAsUser,
      RoyaltiesRegistryAsDeployer,
      ERC721WithRoyaltyV2981,
      user1,
    } = await loadFixture(deployFixtures);
    await loadFixture(deployFixtures);

    const part = {
      account: user1.address,
      value: 1,
    };
    const royalties = [part];
    await RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
      await ERC721WithRoyaltyV2981.getAddress(),
      royalties
    );
    expect(
      await RoyaltiesRegistryAsUser.getRoyaltiesType(
        await ERC721WithRoyaltyV2981.getAddress()
      )
    ).to.be.equal(1);
    expect(
      (
        await RoyaltiesRegistryAsUser.getRoyalties.staticCall(
          await ERC721WithRoyaltyV2981.getAddress(),
          1
        )
      )[0]
    ).to.be.deep.eq([user1.address, 1n]);
  });

  it('should getRoyalties for token with royaltiesType 2 when provider address does not implement getRoyalties', async function () {
    const {
      RoyaltiesRegistryAsDeployer,
      RoyaltiesRegistryAsUser,
      ERC721WithRoyaltyV2981,
      ERC20Contract: ProviderContract,
    } = await loadFixture(deployFixtures);
    await loadFixture(deployFixtures);

    await RoyaltiesRegistryAsDeployer.setProviderByToken(
      await ERC721WithRoyaltyV2981.getAddress(),
      await ProviderContract.getAddress()
    );

    await RoyaltiesRegistryAsDeployer.forceSetRoyaltiesType(
      await ERC721WithRoyaltyV2981.getAddress(),
      2
    );

    expect(
      await RoyaltiesRegistryAsUser.getRoyaltiesType(
        await ERC721WithRoyaltyV2981.getAddress()
      )
    ).to.be.equal(2);

    expect(
      await RoyaltiesRegistryAsUser.getRoyalties.staticCall(
        await ERC721WithRoyaltyV2981.getAddress(),
        1
      )
    ).to.be.deep.eq([]);
  });

  it('should getRoyalties for token with royaltiesType 3 when token address do not implements royaltyInfo', async function () {
    const {
      RoyaltiesRegistryAsDeployer,
      RoyaltiesRegistryAsUser,
      ERC20Contract,
    } = await loadFixture(deployFixtures);
    await loadFixture(deployFixtures);

    await RoyaltiesRegistryAsDeployer.forceSetRoyaltiesType(
      await ERC20Contract.getAddress(),
      3
    );

    expect(
      await RoyaltiesRegistryAsUser.getRoyaltiesType(
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(3);

    expect(
      await RoyaltiesRegistryAsUser.getRoyalties.staticCall(
        await ERC20Contract.getAddress(),
        1
      )
    ).to.be.deep.eq([]);
  });

  it('should getRoyalties for token with royaltiesType 3 that only implements royaltyInfo', async function () {
    const {RoyaltiesRegistryAsDeployer, RoyaltiesRegistryAsUser, RoyaltyInfo} =
      await loadFixture(deployFixtures);
    await loadFixture(deployFixtures);

    await RoyaltiesRegistryAsDeployer.forceSetRoyaltiesType(
      await RoyaltyInfo.getAddress(),
      3
    );

    expect(
      await RoyaltiesRegistryAsUser.getRoyaltiesType(
        await RoyaltyInfo.getAddress()
      )
    ).to.be.equal(3);

    expect(
      await RoyaltiesRegistryAsUser.getRoyalties.staticCall(
        await RoyaltyInfo.getAddress(),
        1
      )
    ).to.be.deep.eq([]);
  });

  it('should not getRoyalties for token with royaltiesType 3 with partial support when royalties exceed 100%', async function () {
    const {
      RoyaltiesRegistryAsDeployer,
      RoyaltiesRegistryAsUser,
      ERC1155WithRoyalty,
    } = await loadFixture(deployFixtures);
    await loadFixture(deployFixtures);

    await ERC1155WithRoyalty.setRoyalties(1000000);
    await RoyaltiesRegistryAsDeployer.forceSetRoyaltiesType(
      await ERC1155WithRoyalty.getAddress(),
      3
    );

    expect(
      await RoyaltiesRegistryAsUser.getRoyaltiesType(
        await ERC1155WithRoyalty.getAddress()
      )
    ).to.be.equal(3);

    await expect(
      RoyaltiesRegistryAsUser.getRoyalties.staticCall(
        await ERC1155WithRoyalty.getAddress(),
        1
      )
    ).to.be.revertedWith('Royalties 2981 exceeds 100%');
  });

  it('should getRoyalties for token with royaltiesType 3 with partial support', async function () {
    const {
      RoyaltiesRegistryAsDeployer,
      RoyaltiesRegistryAsUser,
      ERC1155WithRoyalty,
    } = await loadFixture(deployFixtures);
    await loadFixture(deployFixtures);

    await RoyaltiesRegistryAsDeployer.forceSetRoyaltiesType(
      await ERC1155WithRoyalty.getAddress(),
      3
    );

    expect(
      await RoyaltiesRegistryAsUser.getRoyaltiesType(
        await ERC1155WithRoyalty.getAddress()
      )
    ).to.be.equal(3);

    expect(
      await RoyaltiesRegistryAsUser.getRoyalties.staticCall(
        await ERC1155WithRoyalty.getAddress(),
        1
      )
    ).to.be.deep.eq([]);
  });

  it('should getRoyalties for token with royaltiesType 4', async function () {
    const {
      RoyaltiesRegistryAsUser,
      RoyaltiesRegistryAsDeployer,
      ERC721WithRoyaltyV2981,
    } = await loadFixture(deployFixtures);
    await loadFixture(deployFixtures);

    await RoyaltiesRegistryAsDeployer.forceSetRoyaltiesType(
      await ERC721WithRoyaltyV2981.getAddress(),
      4
    );

    expect(
      await RoyaltiesRegistryAsUser.getRoyalties.staticCall(
        await ERC721WithRoyaltyV2981.getAddress(),
        1
      )
    ).to.be.deep.eq([]);
  });
});
