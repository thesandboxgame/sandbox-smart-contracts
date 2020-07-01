pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "../contracts_common/src/Libraries/SigUtil.sol";
import "../contracts_common/src/BaseWithStorage/Admin.sol";


contract PurchaseValidator is Admin {
    address private _signingWallet;

    /**
     * @notice Check if a purchase message is valid
     * @param from The tx sender or meta tx signer
     * @param to The address of the creator
     * @param catalystIds The types of catalysts to send
     * @param catalystQuantities The amounts of each type of catalyst to send
     * @param gemIds The types of gems to send
     * @param gemQuantities The amounts of each type of gem to send
     * @param nonce A per-creator nonce, incremented to avoid reuse of signatures
     * @param signature A signed message specifying tx details
     * @return True if the referral is valid
     */
    function isPurchaseValid(
        address from,
        address to,
        uint256[] memory catalystIds,
        uint256[] memory catalystQuantities,
        uint256[] memory gemIds,
        uint256[] memory gemQuantities,
        uint256 nonce,
        bytes memory signature
    ) public view returns (bool) {
        bytes32 hashedData = keccak256(abi.encodePacked(from, to, catalystIds, catalystQuantities, gemIds, gemQuantities, nonce));

        address signer = SigUtil.recover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hashedData)), signature);

        return signer == _signingWallet;
    }

    constructor(address initialSigningWallet) public {
        _signingWallet = initialSigningWallet;
    }
}
