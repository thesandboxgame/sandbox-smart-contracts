import {BigNumber, Wallet} from 'ethers';
import fs from 'fs-extra';
import hre, {ethers, network} from 'hardhat';
import {waitFor} from '../utils/utils';
// import {AddressZero} from '@ethersproject/constants';

async function main() {
  const readOnly = network.name !== 'hardhat';

  // const {deployer} = await ethers.getNamedSigners();
  // const ethFaucet = await ethers.getSigner(AddressZero); // FAILS WITH : The nonce generation function failed, or the private key was invalid
  const ethFaucet = await ethers.getSigner(
    '0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead'
  ); //deployer

  // const ethFaucet = await hre.ethers.provider.getSigner(
  //   '0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead'
  // );

  console.log;

  if (!readOnly) {
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [await ethFaucet.getAddress()],
    });
  }

  const stats = {
    min: -1,
    max: -1,
    total: 0,
    num: 0,
  };
  const {transfers} = JSON.parse(
    fs.readFileSync('tmp/asset_regenerations.json').toString()
  );

  const gasPrice = await ethers.provider.getGasPrice();
  const latestBlock = await ethers.provider.getBlock('latest');
  console.log({latestBlockGasLimit: latestBlock.gasLimit.toString()});
  console.log({gasPrice: gasPrice.toString()});

  const numTx = transfers.length;
  let i = 0;
  for (const transfer of transfers) {
    const from = transfer.to;
    const to = Wallet.createRandom().address;
    const ids = transfer.ids;
    const values = transfer.values;
    if (!readOnly) {
      await hre.network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [from],
      });
    }
    const Asset = await ethers.getContract('Asset', from);

    const balance = await ethers.provider.getBalance(from);

    if (readOnly) {
      // estimate gas seems to fails in some cases
      try {
        const estimatedGas = await Asset.estimateGas.safeBatchTransferFrom(
          from,
          to,
          ids,
          values,
          '0x',
          {gasPrice}
        );
        const txCost = gasPrice.mul(estimatedGas);
        console.log({
          estimatedGas: estimatedGas.toString(),
          txCost: txCost.toString(),
        });
        i++;
        console.log(`${i} / ${numTx}`);
        const gas = estimatedGas.toNumber();
        stats.total += gas;
        stats.num++;
        if (stats.min === -1 || gas < stats.min) {
          stats.min = gas;
        }
        if (stats.max === -1 || gas > stats.max) {
          stats.max = gas;
        }
      } catch (e) {
        console.error('ESTIMATE', e);
      }
    } else {
      // if (balance.lt(txCost)) {
      //   console.log({
      //     balance: balance.toString(),
      //     txCost: txCost.toString(),
      //   });
      //   await waitFor(
      //     ethFaucet.sendTransaction({to: from, value: txCost.sub(balance)})
      //   );
      //   const newBalance = await ethers.provider.getBalance(from);
      //   console.log({
      //     newBalance,
      //   });
      // }

      // ensure enough fund
      const minBalance = BigNumber.from('80000000000000000');
      if (balance.lt(minBalance)) {
        try {
          await waitFor(
            ethFaucet.sendTransaction({
              to: from,
              value: minBalance,
            })
          );
        } catch (e) {
          console.error('FAUCET', e);
        }
      }

      console.log(`transfering ${ids.length} assets (${values[0]}, ...) ...`);
      i++;
      console.log(`${i} / ${numTx}`);
      try {
        // TODO sort ids
        const receipt = await waitFor(
          Asset.safeBatchTransferFrom(from, to, ids, values, '0x', {gasPrice})
        );
        const gas = receipt.gasUsed.toNumber();
        console.log({gas});
        stats.total += gas;
        stats.num++;
        if (stats.min === -1 || gas < stats.min) {
          stats.min = gas;
        }
        if (stats.max === -1 || gas > stats.max) {
          stats.max = gas;
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  console.log({stats, average: stats.total / stats.num});
}

main().catch((e) => console.error(e));
