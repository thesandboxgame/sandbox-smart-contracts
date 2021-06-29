import { setupSand as setupPolygonSand } from './fixtures';
import { setupERC20BasicApproveExtension as setupMainnetSand } from '../../sand/fixtures';
import { waitFor, getAssetChainIndex } from '../../utils';
import { expect } from '../../chai-setup';
import { ethers } from 'hardhat';
import { AbiCoder } from 'ethers/lib/utils';
import { BigNumber } from '@ethersproject/bignumber';

const abiCoder = new AbiCoder();

describe('PolygonSand.sol', () => {
  describe("Bridging: L1 <> L2", async () => {
    it("should be able to transfer SAND: L1 to L2", async () => {
      const polygon = await setupPolygonSand();
      const mainnet = await setupMainnetSand();

      const transferAmount = ethers.utils.parseEther("20").toString();

      const mainnet_balance = BigNumber.from(await mainnet.sandContractAsUser0.balanceOf(mainnet.sandBeneficiary.address));
      const polygon_balance = BigNumber.from(await polygon.users[0].Sand.balanceOf(mainnet.sandBeneficiary.address));

      // Grant approval to ERC20 predicate contract
      await waitFor(
        mainnet.sandBeneficiary.sandContract.approve(mainnet.predicate.address, transferAmount)
      );

      // Lock tokens on ERC20 predicate contract
      const data = abiCoder.encode(["uint256"], [transferAmount])
      await waitFor(
        mainnet.predicate.lockTokens(mainnet.sandBeneficiary.address, mainnet.sandBeneficiary.address, data)
      );

      // Emulate the ChildChainManager call to deposit
      await waitFor(
        polygon.childChainManager.callSandDeposit(polygon.Sand.address,mainnet.sandBeneficiary.address, data)
      );

      // Ensure balance is updated on Mainnet & Polygon
      const updated_mainnet_balance = BigNumber.from(await mainnet.sandContractAsUser0.balanceOf(mainnet.sandBeneficiary.address));
      const updated_polygon_balance = BigNumber.from(await polygon.users[0].Sand.balanceOf(mainnet.sandBeneficiary.address));
      expect(updated_mainnet_balance).to.be.equal(mainnet_balance.sub(transferAmount));
      expect(updated_polygon_balance).to.be.equal(polygon_balance.add(transferAmount));
    });
  });
});
