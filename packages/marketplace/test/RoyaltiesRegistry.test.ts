import {simpleDeployFixtures} from './fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {expect} from 'chai';
import {ZeroAddress, Contract, Signer} from 'ethers';
import {upgrades} from 'hardhat';

describe('RoyaltiesRegistry.sol', function () {
  let RoyaltiesRegistryAsDeployer: Contract,
    RoyaltiesRegistryAsUser: Contract,
    Royalties2981ImplMock: Contract,
    ERC721WithRoyaltyV2981: Contract,
    ERC20Contract: Contract,
    ERC1155WithRoyalty: Contract,
    RoyaltyInfo: Contract,
    user1: Signer,
    user2: Signer;

  beforeEach(async function () {
    ({
      ERC721WithRoyaltyV2981,
      RoyaltiesRegistryAsDeployer,
      RoyaltiesRegistryAsUser,
      Royalties2981ImplMock,
      ERC20Contract,
      ERC1155WithRoyalty,
      RoyaltyInfo,
      user1,
      user2,
    } = await loadFixture(simpleDeployFixtures));
  });

  it('should upgrade the contract successfully', async function () {
    const WEIGHT_VALUE = await RoyaltiesRegistryAsDeployer.WEIGHT_VALUE();

    const upgraded = await upgrades.upgradeProxy(
      await RoyaltiesRegistryAsDeployer.getAddress(),
      Royalties2981ImplMock
    );

    expect(await upgraded.WEIGHT_VALUE()).to.be.equal(WEIGHT_VALUE);
  });

  it('should not set provider by token if caller is not owner', async function () {
    await expect(
      RoyaltiesRegistryAsUser.setProviderByToken(
        await ERC721WithRoyaltyV2981.getAddress(),
        user1.getAddress()
      )
    ).to.be.revertedWith('token owner not detected');
  });

  it('should set provider by token', async function () {
    expect(
      await RoyaltiesRegistryAsDeployer.royaltiesProviders(
        await ERC721WithRoyaltyV2981.getAddress()
      )
    ).to.be.equal(ZeroAddress);
    await RoyaltiesRegistryAsDeployer.setProviderByToken(
      await ERC721WithRoyaltyV2981.getAddress(),
      user1.getAddress()
    );
    expect(
      await RoyaltiesRegistryAsDeployer.royaltiesProviders(
        await ERC721WithRoyaltyV2981.getAddress()
      )
    ).to.not.be.equal(ZeroAddress);
  });

  it('should return provider address', async function () {
    await RoyaltiesRegistryAsDeployer.setProviderByToken(
      await ERC721WithRoyaltyV2981.getAddress(),
      user1.getAddress()
    );
    expect(
      await RoyaltiesRegistryAsDeployer.getProvider(
        await ERC721WithRoyaltyV2981.getAddress()
      )
    ).to.be.equal(await user1.getAddress());
  });

  it('should return default royalty type for unset provider', async function () {
    // ROYALTIES_TYPE_UNSET = 0
    expect(
      await RoyaltiesRegistryAsDeployer.getRoyaltiesType(
        await ERC721WithRoyaltyV2981.getAddress()
      )
    ).to.be.equal(0);
  });

  it('should return royalty type', async function () {
    await RoyaltiesRegistryAsDeployer.setProviderByToken(
      await ERC721WithRoyaltyV2981.getAddress(),
      user1.getAddress()
    );
    // ROYALTIES_TYPE_EXTERNAL_PROVIDER = 2
    expect(
      await RoyaltiesRegistryAsDeployer.getRoyaltiesType(
        await ERC721WithRoyaltyV2981.getAddress()
      )
    ).to.be.equal(2);
  });

  it('should not force set royalties type if caller is not owner', async function () {
    await expect(
      RoyaltiesRegistryAsUser.forceSetRoyaltiesType(
        await ERC721WithRoyaltyV2981.getAddress(),
        1
      )
    ).to.be.revertedWith('token owner not detected');
  });

  it('should not force set an invalid royalties type', async function () {
    await expect(
      RoyaltiesRegistryAsDeployer.forceSetRoyaltiesType(
        await ERC721WithRoyaltyV2981.getAddress(),
        5
      )
    ).to.be.revertedWithoutReason();
  });

  it('should be able to force set royalties type', async function () {
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
    ).to.be.revertedWith('token owner not detected');
  });

  it('should clear royalties type', async function () {
    const tokenAddress = await ERC721WithRoyaltyV2981.getAddress();

    await RoyaltiesRegistryAsDeployer.forceSetRoyaltiesType(tokenAddress, 1);
    expect(
      await RoyaltiesRegistryAsDeployer.getRoyaltiesType(tokenAddress)
    ).to.be.equal(1);

    const provider = await RoyaltiesRegistryAsDeployer.getProvider(
      tokenAddress
    );

    await expect(RoyaltiesRegistryAsDeployer.clearRoyaltiesType(tokenAddress))
      .to.emit(RoyaltiesRegistryAsDeployer, 'RoyaltiesTypeSet')
      .withArgs(tokenAddress, 0, provider);

    expect(
      await RoyaltiesRegistryAsDeployer.getRoyaltiesType(
        await ERC721WithRoyaltyV2981.getAddress()
      )
    ).to.be.equal(0);
  });

  it('should not set royalties by token if caller is not owner', async function () {
    const part = {
      account: user1.getAddress(),
      basisPoints: 1,
    };
    const royalties = [part];
    await expect(
      RoyaltiesRegistryAsUser.setRoyaltiesByToken(
        await ERC721WithRoyaltyV2981.getAddress(),
        royalties
      )
    ).to.be.revertedWith('token owner not detected');
  });

  it('should not set royalties with token with a zero address recipient', async function () {
    const part = {
      account: ZeroAddress,
      basisPoints: 1,
    };
    const royalties = [part];
    await expect(
      RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
        await ERC721WithRoyaltyV2981.getAddress(),
        royalties
      )
    ).to.be.revertedWith('recipient should be present');
  });

  it('should not set royalties with token with invalid royalty basisPoints', async function () {
    const part = {
      account: user1.getAddress(),
      basisPoints: 0,
    };
    const royalties = [part];
    await expect(
      RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
        await ERC721WithRoyaltyV2981.getAddress(),
        royalties
      )
    ).to.be.revertedWith('basisPoints should be > 0');
  });

  it('should not set royalties with token when setting royalties exceeding 100%', async function () {
    const part1 = {
      account: user1.getAddress(),
      basisPoints: 5000,
    };
    const part2 = {
      account: user2.getAddress(),
      basisPoints: 5000,
    };
    const royalties = [part1, part2];
    await expect(
      RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
        await ERC721WithRoyaltyV2981.getAddress(),
        royalties
      )
    ).to.be.revertedWith('royalties sum is more than 100%');
  });

  it('should set royalties by token', async function () {
    const tokenAddress = await ERC721WithRoyaltyV2981.getAddress();
    const provider = await RoyaltiesRegistryAsDeployer.getProvider(
      tokenAddress
    );
    const part = {
      account: user1.getAddress(),
      basisPoints: 1,
    };
    const royalties = [part];
    await expect(
      RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(tokenAddress, royalties)
    )
      .to.emit(RoyaltiesRegistryAsDeployer, 'RoyaltiesSetForContract')
      .to.emit(RoyaltiesRegistryAsDeployer, 'RoyaltiesTypeSet')
      .withArgs(tokenAddress, 1, provider);
  });

  it('should updates royaltiesType for unset token with getRoyalties', async function () {
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
    const part = {
      account: user1.getAddress(),
      basisPoints: 1,
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
    ).to.be.deep.eq([await user1.getAddress(), 1n]);
  });

  it('should getRoyalties for token with royaltiesType 2 when provider address does not implement getRoyalties', async function () {
    const ProviderContract = ERC20Contract;

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
    ).to.be.revertedWith('royalties 2981 exceeds 100%');
  });

  it('should getRoyalties for token with royaltiesType 3 with partial support', async function () {
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
