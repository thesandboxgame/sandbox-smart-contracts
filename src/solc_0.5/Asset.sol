pragma solidity 0.5.9;

import "./Asset/ERC1155ERC721.sol";

contract Asset is ERC1155ERC721 {
    bool internal _init;

    function init(
        address metaTransactionContract,
        address assetAdmin,
        address bouncerAdmin
    ) public {
      require(!_init, "ALREADY_INITIALISED");
        _init = true;
      ERC1155ERC721.init_ERC1155ERC721(metaTransactionContract, assetAdmin, bouncerAdmin);
    }
}
