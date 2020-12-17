//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

/// @title Interface for the Game token

interface IGameToken {
    function createGame(
        address from,
        address to,
        uint256[] calldata assetIds,
        uint256[] calldata values,
        address editor,
        string calldata uri,
        uint64 randomId
    ) external returns (uint256 id);

    function destroyGame(
        address from,
        address to,
        uint256 gameId
    ) external;

    function recoverAssets(
        address from,
        address to,
        uint256 gameId,
        uint256[] calldata assetIds
    ) external;

    function destroyAndRecover(
        address from,
        address to,
        uint256 gameId,
        uint256[] calldata assetIds
    ) external;

    function updateGame(
        address from,
        address to,
        uint256 gameId,
        uint256[] calldata addAssets,
        uint256[] calldata addAmounts,
        uint256[] calldata removeAssets,
        uint256[] calldata removeAmounts,
        string calldata uri
    ) external returns (uint256);

    function getAssetBalances(uint256 gameId, uint256[] calldata assetIds) external view returns (uint256[] calldata);

    function setGameEditor(
        address from,
        uint256 gameId,
        address editor,
        bool isEditor
    ) external;

    function isGameEditor(uint256 gameId, address editor) external view returns (bool isEditor);

    function creatorOf(uint256 id) external view returns (address);

    function transferCreatorship(
        address sender,
        address original,
        address to
    ) external;

    function name() external pure returns (string memory);

    function symbol() external pure returns (string memory);

    function tokenURI(uint256 gameId) external returns (string memory uri);

    function onERC1155Received(
        address operator,
        address, /*from*/
        uint256, /*id*/
        uint256, /*value*/
        bytes calldata /*data*/
    ) external view returns (bytes4);

    function onERC1155BatchReceived(
        address operator,
        address, /*from*/
        uint256[] calldata, /*ids*/
        uint256[] calldata, /*values*/
        bytes calldata /*data*/
    ) external view returns (bytes4);
}
