//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

interface IGameMinter {
    function createGame(
        address from,
        address to,
        uint256[] memory assetIds,
        uint256[] memory values,
        address editor,
        string memory uri,
        uint96 randomId
    ) external returns (uint256 gameId);

    function addAssets(
        address from,
        uint256 gameId,
        uint256[] memory assetIds,
        uint256[] memory values,
        string memory uri,
        address editor
    ) external;

    function removeAssets(
        address from,
        uint256 gameId,
        uint256[] memory assetIds,
        uint256[] memory values,
        address to,
        string memory uri,
        address editor
    ) external;

    function setTokenUri(
        address from,
        uint256 gameId,
        string calldata uri,
        address editor
    ) external;
}
