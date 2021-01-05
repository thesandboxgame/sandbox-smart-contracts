//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;
pragma experimental ABIEncoderV2;

import "./IGameToken.sol";

interface IGameMinter {
    function createGame(
        address from,
        address to,
        IGameToken.Update calldata creation,
        address editor,
        uint64 subId
    ) external returns (uint256 gameId);

    function updateGame(
        address from,
        uint256 gameId,
        IGameToken.Update memory update,
        address editor
    ) external returns (uint256 newId);
}
