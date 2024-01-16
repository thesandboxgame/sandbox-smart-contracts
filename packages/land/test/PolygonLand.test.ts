import {expect} from 'chai';
import {deployFixtures} from './fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';

describe('PolygonLand.sol', function () {
  it('manager contract royalty setter can set Eip 2981 royaltyBps for other contracts (PolygonLand)', async function () {
    const {managerAsRoyaltySetter, PolygonLandContractAsDeployer} =
      await loadFixture(deployFixtures);

    expect(
      await managerAsRoyaltySetter.contractRoyalty(
        PolygonLandContractAsDeployer.getAddress(),
      ),
    ).to.be.equal(0);
    await managerAsRoyaltySetter.setContractRoyalty(
      PolygonLandContractAsDeployer.getAddress(),
      500,
    );
    expect(
      await managerAsRoyaltySetter.contractRoyalty(
        PolygonLandContractAsDeployer.getAddress(),
      ),
    ).to.be.equal(500);
  });

  it('only manager contract royalty setter can set Eip 2981 royaltyBps for other contracts (PolygonLand)', async function () {
    const {
      RoyaltyManagerContract,
      deployer,
      PolygonLandContractAsDeployer,
      contractRoyaltySetterRole,
    } = await loadFixture(deployFixtures);
    await expect(
      RoyaltyManagerContract.connect(deployer).setContractRoyalty(
        PolygonLandContractAsDeployer.getAddress(),
        500,
      ),
    ).to.be.revertedWith(
      `AccessControl: account ${deployer.address.toLocaleLowerCase()} is missing role ${contractRoyaltySetterRole}`,
    );
  });

  it('PolygonLand should return EIP2981 royalty recipient and royalty', async function () {
    const {
      commonRoyaltyReceiver,
      PolygonLandContractAsDeployer,
      managerAsRoyaltySetter,
    } = await loadFixture(deployFixtures);

    await managerAsRoyaltySetter.setContractRoyalty(
      PolygonLandContractAsDeployer.getAddress(),
      500,
    );
    const id = 1;
    const priceToken = 300000;
    const royaltyInfo = await PolygonLandContractAsDeployer.royaltyInfo(
      id,
      priceToken,
    );
    expect(royaltyInfo[0]).to.be.equals(commonRoyaltyReceiver.address);
    expect(royaltyInfo[1]).to.be.equals((500 * priceToken) / 10000);
  });
});
