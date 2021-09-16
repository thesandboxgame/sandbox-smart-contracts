import {expectEventWithArgs, waitFor} from '../utils';
import {Contract, ContractReceipt, BigNumber, utils} from 'ethers';
import {ethers, getNamedAccounts} from 'hardhat';
import {Address} from 'hardhat-deploy/types';

export async function getId(
  estate: Contract,
  receipt: ContractReceipt,
  eventName: string
): Promise<BigNumber> {
  const eventWithArgs = await expectEventWithArgs(estate, receipt, eventName);
  return eventWithArgs.args[0];
}

export async function getNewGame(
  gameToken: Contract,
  from: Address,
  to: Address,
  assetIds: BigNumber[] | null,
  assetAmounts: number[] | null,
  subId: number
): Promise<BigNumber> {
  if (assetIds) {
    if (!assetAmounts || assetIds.length != assetAmounts.length) {
      throw new Error('Input Parameter length mismatch in getNewGame');
    }
  }
  const update = {
    assetIdsToRemove: [],
    assetAmountsToRemove: [],
    assetIdsToAdd: [],
    assetAmountsToAdd: [],
    uri: utils.keccak256(ethers.utils.toUtf8Bytes('')),
  };
  const {gameTokenAdmin} = await getNamedAccounts();
  const gameTokenAsMinter = await gameToken.connect(
    ethers.provider.getSigner(gameTokenAdmin)
  );

  const receipt = await waitFor(
    gameTokenAsMinter.createGame(
      from,
      to,
      {...update, assetIdsToAdd: assetIds, assetAmountsToAdd: assetAmounts},
      ethers.constants.AddressZero,
      subId
    )
  );

  const transferEvent = await expectEventWithArgs(
    gameToken,
    receipt,
    'Transfer'
  );
  const gameId = transferEvent.args[2];
  return gameId;
}
