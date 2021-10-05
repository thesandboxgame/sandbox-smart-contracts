import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';

import {Address} from 'hardhat-deploy/types';
import {Contract} from 'ethers';
import {withSnapshot} from '../utils';

export interface User {
  address: Address;
  Game: Contract;
}

export const setupTest = withSnapshot(['ChildGameToken'], async () => {
  const {gameTokenAdmin} = await getNamedAccounts();
  const others = await getUnnamedAccounts();

  const gameToken = await ethers.getContract('ChildGameToken');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const trustedForwarder = await ethers.getContractAt(
    'TestMetaTxForwarder',
    TRUSTED_FORWARDER.address
  );
  const gameTokenAsAdmin = await ethers.getContract(
    'ChildGameToken',
    gameTokenAdmin
  );

  const users = [];
  for (const other of others) {
    users.push({
      address: other,
      Game: gameToken.connect(ethers.provider.getSigner(other)),
    });
  }

  const GameOwner = {
    address: users[0].address,
    Game: gameToken.connect(ethers.provider.getSigner(users[0].address)),
  };

  const GameEditor1 = {
    address: users[1].address,
    Game: gameToken.connect(ethers.provider.getSigner(users[1].address)),
  };

  const GameEditor2 = {
    address: users[1].address,
    Game: gameToken.connect(ethers.provider.getSigner(users[2].address)),
  };

  return {
    gameToken,
    gameTokenAsAdmin,
    GameOwner,
    GameEditor1,
    GameEditor2,
    users,
    trustedForwarder,
  };
});
