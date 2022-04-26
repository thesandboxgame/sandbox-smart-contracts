//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

/// @title Interface for the Game token

interface IGameToken {
    struct GameData1155 {
        uint256[] assetIdsToRemove;
        uint256[] assetAmountsToRemove;
        uint256[] assetIdsToAdd;
        uint256[] assetAmountsToAdd;
    }

    struct GameData721 {
        uint256[] assetIdsToRemove;
        uint256[] assetIdsToAdd;
    }

    struct GameData {
        GameData1155 gameData1155;
        GameData721 gameData721;
        bytes32 uri; // ipfs hash (without the prefix, assume cidv1 folder)
    }

    function createGame(
        address from,
        address to,
        GameData calldata creation,
        address editor,
        uint64 subId
    ) external returns (uint256 id);

    function burn(uint256 gameId) external;

    function burnFrom(address from, uint256 gameId) external;

    function recoverAssets(
        address from,
        address to,
        uint256 gameId,
        uint256[] calldata assetERC1155Ids,
        uint256[] calldata assetERC721Ids
    ) external;

    function burnAndRecover(
        address from,
        address to,
        uint256 gameId,
        uint256[] calldata assetERC1155Ids,
        uint256[] calldata assetERC721Ids
    ) external;

    function updateGame(
        address from,
        uint256 gameId,
        GameData calldata update
    ) external returns (uint256);

    function getERC1155AssetBalances(uint256 gameId, uint256[] calldata assetIds)
        external
        view
        returns (uint256[] calldata);

    function getERC721AssetBalances(uint256 gameId, uint256[] calldata assetIds)
        external
        view
        returns (uint256[] calldata);

    function setGameEditor(
        address gameCreator,
        address editor,
        bool isEditor
    ) external;

    function isGameEditor(address gameOwner, address editor) external view returns (bool isEditor);

    function creatorOf(uint256 id) external view returns (address);

    function transferCreatorship(
        uint256 gameId,
        address sender,
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
