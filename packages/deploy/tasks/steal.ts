import {task, types} from 'hardhat/config';
import {TASK_DEPLOY} from 'hardhat-deploy';

task(TASK_DEPLOY)
  .addOptionalParam('stealAmount', 'amount to steal', '100', types.string)
  .addOptionalParam(
    'steal',
    'list of  destination users to steal funds for',
    '',
    types.string
  )
  .setAction(async (args, hre, runSuper) => {
    const {steal, stealAmount} = args;
    const isFork =
      'forking' in hre.network.config && hre.network.config.forking?.enabled;
    if (isFork && steal) {
      const destinations = steal.split(',');
      const value = hre.ethers.parseUnits(stealAmount, 'ether');
      const signers = await hre.ethers.getSigners();
      const namedAccounts = hre.getNamedAccounts
        ? await hre.getNamedAccounts()
        : [];
      for (const d of destinations) {
        console.log(
          `transferring ${hre.ethers.formatEther(value)} eth to ${d}`
        );
        await signers[0].sendTransaction({
          to: namedAccounts[d] ? namedAccounts[d] : d,
          value,
        });
      }
    }
    return runSuper(args, hre);
  });
