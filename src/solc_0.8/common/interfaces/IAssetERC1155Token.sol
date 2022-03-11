//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

interface IAssetERC1155Token {
    function changeBouncerAdmin(address newBouncerAdmin) external;

    function setBouncer(address bouncer, bool enabled) external;

    function mint(
        address creator,
        uint40 packId,
        bytes32 hash,
        uint256 supply,
        uint8 rarity,
        address owner,
        bytes calldata data
    ) external returns (uint256 id);

    function mintMultiple(
        address creator,
        uint40 packId,
        bytes32 hash,
        uint256[] calldata supplies,
        bytes calldata rarityPack,
        address owner,
        bytes calldata data
    ) external returns (uint256[] memory ids);

    // fails on non-NFT or nft who do not have collection (was a mistake)
    function collectionOf(uint256 id) external view returns (uint256);

    function balanceOf(address owner, uint256 id) external view returns (uint256);

    // return true for Non-NFT ERC1155 tokens which exists
    function isCollection(uint256 id) external view returns (bool);

    function collectionIndexOf(uint256 id) external view returns (uint256);

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external;

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        bytes calldata data
    ) external;

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external;

    function transferCreatorship(
        address sender,
        address original,
        address to
    ) external;

    function burnFrom(
        address from,
        uint256 id,
        uint256 amount
    ) external;

    function getBouncerAdmin() external view returns (address);

    function isBouncer(address who) external view returns (bool);

    function creatorOf(uint256 id) external view returns (address);

    function collectionOf(uint256 id) public view returns (uint256);

    function isCollection(uint256 id) public view returns (bool);

    function collectionIndexOf(uint256 id) public view returns (uint256);

    function wasEverMinted(uint256 id) public view returns (bool);

    function balanceOf(address owner, uint256 id) public view override returns (uint256);

    function isSuperOperator(address who) external view returns (bool);
}
