import {
  ethers,
  deployments,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';

import {Address} from 'hardhat-deploy/types';
import {Contract} from 'ethers';

export interface User {
  address: Address;
  Game: Contract;
}

export const setupTest = deployments.createFixture(async () => {
  const {gameTokenAdmin} = await getNamedAccounts();
  const others = await getUnnamedAccounts();
  await deployments.fixture('GameToken');
  await deployments.fixture('L2_GameToken');

  const gameToken = await ethers.getContract('GameToken');
  const L2_gameToken = await ethers.getContract('L2_GameToken');
  const gameTokenAsAdmin = await ethers.getContract(
    'GameToken',
    gameTokenAdmin
  );
  const L2_gameTokenAsAdmin = await ethers.getContract(
    'GameToken',
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
    L2_gameToken,
    gameTokenAsAdmin,
    GameOwner,
    GameEditor1,
    GameEditor2,
    users,
    testMetaTxForwarder,
  };
});
