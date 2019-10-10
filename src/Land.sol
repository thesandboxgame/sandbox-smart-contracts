/* solhint-disable no-empty-blocks */

pragma solidity 0.5.9;

import "./Land/erc721/LandBaseToken.sol";
import "../contracts_common/src/BaseWithStorage/ProxyImplementation.sol";


contract Land is ProxyImplementation, LandBaseToken {
    constructor(
        address metaTransactionContract,
        address admin
    ) public LandBaseToken(
        metaTransactionContract,
        admin
    ) {
    }
}
