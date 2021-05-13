import {expectEventWithArgs} from '../utils';
import {Contract, ContractReceipt, BigNumber} from 'ethers';

export async function getId(
  estate: Contract,
  receipt: ContractReceipt,
  eventName: string
): Promise<BigNumber> {
  const eventWithArgs = await expectEventWithArgs(estate, receipt, eventName);
  return eventWithArgs.args[0];
}
