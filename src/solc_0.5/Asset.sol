pragma solidity 0.5.9;

import "./Asset/ERC1155ERC721.sol";

contract Asset is ERC1155ERC721 {
    function init(
        address metaTransactionContract,
        address assetAdmin,
        address bouncerAdmin
    ) public {
      ERC1155ERC721.init_ERC1155ERC721(metaTransactionContract, assetAdmin, bouncerAdmin);
    }
}
