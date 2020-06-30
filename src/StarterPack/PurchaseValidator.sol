pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "../contracts_common/src/Libraries/SigUtil.sol";
import "../contracts_common/src/BaseWithStorage/Admin.sol";


contract PurchaseValidator is Admin {
    address private _signingWallet;

    /**
     * @notice Check if a purchase message is valid
     * @param signature The signature to check (signed purchase message)
     * @param from The address of the referrer
     * @param to The address of the creator
     * @param catalystIds The address of the creator
     * @param catalystQuantities The address of the creator
     * @param gemIds The address of the creator
     * @param gemQuantities The address of the creator
     * @param nonce The address of the creator
     * @param expiryTime The expiry time of the referral
     * @return True if the referral is valid
     */
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
        // if (now > expiryTime) {
        //     return false;
        // }
        // if (nonce already used) {
        //   return false
        // }
        bytes32 hashedData = keccak256(abi.encodePacked(from, to, catalystIds, catalystQuantities, gemIds, gemQuantities, nonce, expiryTime));

        address signer = SigUtil.recover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hashedData)), signature);

        return signer == _signingWallet;
    }

    constructor(address initialSigningWallet) public {
        _signingWallet = initialSigningWallet;
    }
}
