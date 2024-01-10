import {deployments, ethers, getNamedAccounts} from 'hardhat';

import {BigNumber, Contract} from 'ethers';
import {withSnapshot} from '../utils';

export const setupERC677 = withSnapshot(['ERC20TokenUpgradeable'], async () => {
  const accounts = await getNamedAccounts();
  await deployments.deploy('ERC20TokenUpgradeable', {
    contract: 'ERC20TokenUpgradeable',
    from: accounts.sandAdmin,
    log: true,
    proxy: {
      owner: accounts.sandAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: '__ERC20TokenUpgradeable_init',
        args: [
          'ERC20_Example',
          'ERC20_Example',
          ethers.constants.AddressZero,
          accounts.sandAdmin,
        ],
      },
    },
  });
  const sand: Contract = await ethers.getContract('ERC20TokenUpgradeable');
  await deployments.deploy('MockERC677Receiver', {
    from: accounts.deployer,
    args: [],
  });
  const tokenReceiver: Contract = await ethers.getContract(
    'MockERC677Receiver'
  );
  await deployments.deploy('EmptyContract', {
    from: accounts.deployer,
    args: [],
  });
  const emptyContract: Contract = await ethers.getContract('EmptyContract');
  await deployments.deploy('FallBackContract', {
    from: accounts.deployer,
    args: [],
  });
  const fallbackContract: Contract = await ethers.getContract(
    'FallBackContract'
  );

  const tx = await sand
    .connect(ethers.provider.getSigner(accounts.sandAdmin))
    .mint(accounts.deployer, BigNumber.from('100000000000000000000'));
  await tx.wait();
  return {
    sand,
    tokenReceiver,
    emptyContract,
    fallbackContract,
  };
});
