import { ethers, getNamedAccounts } from 'hardhat';
import { BigNumber } from '@ethersproject/bignumber';
import { expect } from '../chai-setup';
import { ContractFactory, Contract } from 'ethers';

describe('ERC677Token', function () {
  async function initContracts(name: string, symbol: string) {
    const accounts = await getNamedAccounts();
    const token: Contract = await initContract(
      'ERC20Token',
      accounts.deployer,
      [name, symbol, accounts.deployer]
    );
    const tokenReceiver: Contract = await initContract(
      'MockERC677Receiver',
      accounts.deployer,
      []
    );
    const tx = await token
      .connect(ethers.provider.getSigner(accounts.deployer))
      .mint(accounts.deployer, BigNumber.from('800000000000000000'));
    await tx.wait();
    return { token, tokenReceiver };
  }

  async function initContract(
    contractName: string,
    deployer: string,
    params: Array<string>
  ): Promise<Contract> {
    const ethersFactory: ContractFactory = await ethers.getContractFactory(
      contractName,
      ethers.provider.getSigner(deployer)
    );
    const contractRef: Contract = await ethersFactory.deploy(...params);
    return contractRef;
  }

  it('Transfering tokens to ERC677Receiver contract should emit an OnTokenTransferEvent', async function () {
    const { token, tokenReceiver } = await initContracts('MOCK', 'MOCK');
    const accounts = await getNamedAccounts();
    const fromBalanceBefore = await token.balanceOf(accounts.deployer);
    const toBalanceBefore = await token.balanceOf(tokenReceiver.address);
    const amount = BigNumber.from('100000000000000000');
    const tx = await token
      .connect(ethers.provider.getSigner(accounts.deployer))
      .transferAndCall(tokenReceiver.address, amount, Buffer.from('data'));
    await tx.wait();
    const fromBalanceAfter = await token.balanceOf(accounts.deployer);
    const toBalanceAfter = await token.balanceOf(tokenReceiver.address);
    const tokenReceiverEvents = await tokenReceiver.queryFilter(
      tokenReceiver.filters.OnTokenTransferEvent()
    );
    const event = tokenReceiverEvents.filter(
      (e) => e.event === 'OnTokenTransferEvent'
    )[0];
    expect(event.args).not.to.equal(null || undefined);
    if (event.args) {
      expect(event.args[0].toLowerCase()).to.equal(
        accounts.deployer.toLowerCase()
      );
      expect(event.args[1]).to.equal(amount);
      expect(event.args[2]).to.equal('0x64617461');
      expect(fromBalanceBefore).to.equal(fromBalanceAfter.add(amount));
      expect(toBalanceAfter).to.equal(toBalanceBefore.add(amount));
    }
  });
  it('Transfering tokens to EOA', async function () {
    const { token } = await initContracts('MOCK', 'MOCK');
    const accounts = await getNamedAccounts();
    const fromBalanceBefore = await token.balanceOf(accounts.deployer);
    const toBalanceBefore = await token.balanceOf(accounts.sandAdmin);
    const amount = BigNumber.from('100000000000000000');
    const tx = await token
      .connect(ethers.provider.getSigner(accounts.deployer))
      .transferAndCall(accounts.sandAdmin, amount, Buffer.from('data'));
    await tx.wait();
    const fromBalanceAfter = await token.balanceOf(accounts.deployer);
    const toBalanceAfter = await token.balanceOf(accounts.sandAdmin);
    expect(fromBalanceBefore).to.equal(fromBalanceAfter.add(amount));
    expect(toBalanceAfter).to.equal(toBalanceBefore.add(amount));
  });
  it('Transfering tokens to a non receiver contract should fail', async function () {
    const accounts = await getNamedAccounts();
    const { token } = await initContracts('MOCK', 'MOCK');
    const emptyContract = await initContract(
      'EmptyContract',
      accounts.deployer,
      []
    );
    const toBalanceBefore = await token.balanceOf(emptyContract.address);

    const amount = BigNumber.from('100000000000000000');
    expect(
      token
        .connect(ethers.provider.getSigner(accounts.deployer))
        .transferAndCall(emptyContract.address, amount, Buffer.from('data'))
    ).to.be.revertedWith('');
    const toBalanceAfter = await token.balanceOf(emptyContract.address);
    expect(toBalanceAfter).to.equal(toBalanceBefore);
  });
  it('Transfering tokens to a contract with fallback function should succeed', async function () {
    const accounts = await getNamedAccounts();
    const { token } = await initContracts('MOCK', 'MOCK');
    const fallbackContract = await initContract(
      'FallBackContract',
      accounts.deployer,
      []
    );
    const toBalanceBefore = await token.balanceOf(fallbackContract.address);
    const fromBalanceBefore = await token.balanceOf(accounts.deployer);

    const amount = BigNumber.from('100000000000000000');
    token
      .connect(ethers.provider.getSigner(accounts.deployer))
      .transferAndCall(fallbackContract.address, amount, Buffer.from('data'));
    const fromBalanceAfter = await token.balanceOf(accounts.deployer);
    const toBalanceAfter = await token.balanceOf(fallbackContract.address);
    expect(fromBalanceBefore).to.equal(fromBalanceAfter.add(amount));
    expect(toBalanceAfter).to.equal(toBalanceBefore.add(amount));
  });
});
