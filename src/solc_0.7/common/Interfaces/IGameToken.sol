//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;
pragma experimental ABIEncoderV2;

/// @title Interface for the Game token

interface IGameToken {
    struct Update {
        uint256[] assetIdsToRemove;
        uint256[] assetAmountsToRemove;
        uint256[] assetIdsToAdd;
        uint256[] assetAmountsToAdd;
        bytes32 uri;
    }

    function createGame(
        address from,
        address to,
        Update calldata creation,
        address editor,
        uint64 subId
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
        Update calldata update
    ) external returns (uint256);

    function getAssetBalances(uint256 gameId, uint256[] calldata assetIds) external view returns (uint256[] calldata);

    function setGameEditor(
        address gameCreator,
        address editor,
        bool isEditor
    ) external;

    function isGameEditor(address gameOwner, address editor) external view returns (bool isEditor);

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

    function originalId(uint256 gameId) external view returns (uint256);
}
