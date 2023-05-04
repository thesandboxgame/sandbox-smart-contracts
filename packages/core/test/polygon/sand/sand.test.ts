import {setupMainnetSand, setupPolygonSand} from './fixtures';
import {waitFor} from '../../utils';
import {expect} from '../../chai-setup';
import {ethers} from 'hardhat';
import {AbiCoder} from 'ethers/lib/utils';
import {BigNumber} from '@ethersproject/bignumber';
import {constants} from 'ethers';

const abiCoder = new AbiCoder();

describe('PolygonSand.sol', function () {
  describe('Bridging: L1 <> L2', function () {
    it('should update the child chain manager', async function () {
      const polygon = await setupPolygonSand();

      await polygon.sand
        .connect(await ethers.getSigner(await polygon.sand.getAdmin()))
        .updateChildChainManager(polygon.childChainManager.address);
    });
    it('should fail if not owner when updating the child chain manager', async function () {
      const polygon = await setupPolygonSand();

      await expect(
        polygon.users[1].sand.updateChildChainManager(polygon.users[1].address)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('should fail when updating the child chain manager to address(0)', async function () {
      const polygon = await setupPolygonSand();

      await expect(
        polygon.sand
          .connect(await ethers.getSigner(await polygon.sand.getAdmin()))
          .updateChildChainManager(
            ethers.utils.getAddress(constants.AddressZero)
          )
      ).to.be.revertedWith('Bad ChildChainManagerProxy address');
    });
    it('should be able to transfer SAND: L1 to L2', async function () {
      const polygon = await setupPolygonSand();
      const mainnet = await setupMainnetSand();

      const transferAmount = ethers.utils.parseEther('20').toString();

      const mainnet_balance = BigNumber.from(
        await mainnet.sandContractAsUser0.balanceOf(
          mainnet.sandBeneficiary.address
        )
      );
      const polygon_balance = BigNumber.from(
        await polygon.users[0].sand.balanceOf(polygon.sandBeneficiary.address)
      );

      // Grant approval to ERC20 predicate contract
      await waitFor(
        mainnet.sandBeneficiary.sandContract.approve(
          mainnet.predicate.address,
          transferAmount
        )
      );

      // Lock tokens on ERC20 predicate contract
      const data = abiCoder.encode(['uint256'], [transferAmount]);
      await waitFor(
        mainnet.predicate.lockTokens(
          mainnet.sandBeneficiary.address,
          polygon.sandBeneficiary.address,
          data
        )
      );

      // Emulate the ChildChainManager call to deposit
      await waitFor(
        polygon.childChainManager.callSandDeposit(
          polygon.sand.address,
          polygon.sandBeneficiary.address,
          data
        )
      );

      // Ensure balance is updated on Mainnet & Polygon
      const updated_mainnet_balance = BigNumber.from(
        await mainnet.sandContractAsUser0.balanceOf(
          mainnet.sandBeneficiary.address
        )
      );
      const updated_polygon_balance = BigNumber.from(
        await polygon.users[0].sand.balanceOf(polygon.sandBeneficiary.address)
      );

      expect(updated_mainnet_balance).to.be.equal(
        mainnet_balance.sub(transferAmount)
      );
      expect(updated_polygon_balance).to.be.equal(
        polygon_balance.add(transferAmount)
      );
    });
    it('should be able to transfer SAND: L2 to L1', async function () {
      const polygon = await setupPolygonSand();
      const mainnet = await setupMainnetSand();

      const transferAmount = ethers.utils.parseEther('20').toString();

      // Transfer: L1 to L2
      await waitFor(
        mainnet.sandBeneficiary.sandContract.approve(
          mainnet.predicate.address,
          transferAmount
        )
      );
      const data = abiCoder.encode(['uint256'], [transferAmount]);
      await waitFor(
        mainnet.predicate.lockTokens(
          mainnet.sandBeneficiary.address,
          mainnet.sandBeneficiary.address,
          data
        )
      );
      await waitFor(
        polygon.childChainManager.callSandDeposit(
          polygon.sand.address,
          mainnet.sandBeneficiary.address,
          data
        )
      );

      const mainnet_balance = BigNumber.from(
        await mainnet.sandContractAsUser0.balanceOf(
          mainnet.sandBeneficiary.address
        )
      );
      const polygon_balance = BigNumber.from(
        await polygon.users[0].sand.balanceOf(mainnet.sandBeneficiary.address)
      );

      // Withdraw tokens from PolygonSand
      await waitFor(polygon.sandBeneficiary.sand.withdraw(transferAmount));

      // Emulate exit token
      await waitFor(
        mainnet.predicate.exitTokens(
          mainnet.sandBeneficiary.address,
          transferAmount
        )
      );

      // Ensure balance is updated on Mainnet & Polygon
      const updated_mainnet_balance = BigNumber.from(
        await mainnet.sandContractAsUser0.balanceOf(
          mainnet.sandBeneficiary.address
        )
      );
      const updated_polygon_balance = BigNumber.from(
        await polygon.users[0].sand.balanceOf(mainnet.sandBeneficiary.address)
      );

      expect(updated_mainnet_balance).to.be.equal(
        mainnet_balance.add(transferAmount)
      );
      expect(updated_polygon_balance).to.be.equal(
        polygon_balance.sub(transferAmount)
      );
    });
  });

  describe('Getters', function () {
    it('gets the correct name of the Sand Token', async function () {
      const polygon = await setupPolygonSand();
      const name = await polygon.deployer.sand.name();
      expect(name).to.equal('SAND');
    });

    it('gets the correct symbol of the Sand Token', async function () {
      const polygon = await setupPolygonSand();
      const symbol = await polygon.deployer.sand.symbol();
      expect(symbol).to.equal('SAND');
    });
  });
});
