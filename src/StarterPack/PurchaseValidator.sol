pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;


contract PurchaseValidator {
    address private _signingWallet;

    function isPurchaseValid(
        bytes memory signature,
        address from,
        address to,
        uint256[4] memory catalystIds,
        uint256[4] memory catalystQuantities,
        uint256[5] memory gemIds,
        uint256[5] memory gemQuantities,
        uint256 nonce,
        uint256 expiryTime
    ) public view returns (bool) {
        return true;
    }

    constructor(address initialSigningWallet) public {
        _signingWallet = initialSigningWallet;
    }
}
