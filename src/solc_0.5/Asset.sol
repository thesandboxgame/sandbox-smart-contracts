pragma solidity 0.5.9;

import "./Asset/ERC1155ERC721.sol";

contract Asset is ERC1155ERC721 {
    constructor(
        address metaTransactionContract,
        address assetAdmin,
        address bouncerAdmin
    ) public ERC1155ERC721(metaTransactionContract, assetAdmin, bouncerAdmin) {}
}
