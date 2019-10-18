/* solhint-disable no-empty-blocks */

pragma solidity 0.5.9;

import "./Land/erc721/LandBaseToken.sol";

contract Land is LandBaseToken {
    constructor(
        address metaTransactionContract,
        address admin
    ) public LandBaseToken(
        metaTransactionContract,
        admin
    ) {
    }
}
