import {formatEther} from '@ethersproject/units';
import {ethers, getNamedAccounts} from 'hardhat';

async function main() {
  const {deployer} = await getNamedAccounts();
  const Sand = await ethers.getContract('Sand', deployer);
  const amount = await Sand.callStatic.balanceOf(Sand.address);
  console.log({amount: formatEther(amount)});
  const {data} = await Sand.populateTransaction.transfer(deployer, amount);

  await (async () => {
    const sender = '0x7A9fe22691c811ea339D9B73150e6911a5343DcA';
    const {data} = await Sand.populateTransaction.transfer(sender, amount);
    console.log('TO PERFORM', [Sand.address, amount.toString(), data]);
  })();

  const tx = await Sand.paidCall(Sand.address, amount, data);
  console.log({hash: tx.hash});
  const receipt = await tx.wait();
  console.log({gasUsed: receipt.gasUsed.toString()});
  console.log(JSON.stringify(receipt.events), null, '  ');
}

main().catch((e) => console.error(e));
