import {BigNumber, Contract} from 'ethers';
import {ethers, getNamedAccounts} from 'hardhat';
import {Receipt} from 'hardhat-deploy/types';
import {waitFor} from '../../../scripts/utils/utils';

export async function transferSand(
  sandContract: Contract,
  to: string,
  amount: BigNumber
): Promise<void> {
  const {sandBeneficiary} = await getNamedAccounts();
  await waitFor(
    sandContract
      .connect(ethers.provider.getSigner(sandBeneficiary))
      .transfer(to, amount)
  );
}





class ReceiptObject {
  receipt: Receipt;
  type: number;
  constructor(rec: Receipt, _type: number) {
    this.receipt = rec;
    this.type = _type;
  }
}


export async function getReceiptObject(
  receipt: Receipt,
  type: number
): Promise<ReceiptObject> {
  return new ReceiptObject(receipt, type);
}

