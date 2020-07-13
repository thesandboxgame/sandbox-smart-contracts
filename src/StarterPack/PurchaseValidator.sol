pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "../contracts_common/src/Libraries/SigUtil.sol";
import "../contracts_common/src/BaseWithStorage/Admin.sol";


contract PurchaseValidator is Admin {
    address private _signingWallet;

    // A parallel-queue mapping to nonces.
    mapping(address => mapping(uint128 => uint128)) public queuedNonces;

    function getNonceByBuyer(address _buyer, uint128 _queueId) external view returns (uint128) {
        return queuedNonces[_buyer][_queueId];
    }

    /**
     * @notice Check if a purchase message is valid
     * @param from The tx sender
     * @param catalystIds The catalyst IDs to be purchased
     * @param catalystQuantities The quantities of the catalysts to be purchased
     * @param gemIds The gem IDs to be purchased
     * @param gemQuantities The quantities of the gems to be purchased
     * @param buyer The intended recipient of the purchased items
     * @param nonce The nonce to be incremented
     * @param signature A signed message specifying tx details
     * @return True if the purchase is valid
     */
    function isPurchaseValid(
        address from,
        uint256[] memory catalystIds,
        uint256[] memory catalystQuantities,
        uint256[] memory gemIds,
        uint256[] memory gemQuantities,
        address buyer,
        uint256 nonce,
        bytes memory signature
    ) public returns (bool) {
        require(from == buyer, "INVALID_SENDER");
        require(_checkAndUpdateNonce(buyer, nonce), "INVALID_NONCE");
        require(from == message.buyer, "INVALID_SENDER");
        require(checkAndUpdateNonce(message.buyer, message.nonce), "INVALID_NONCE");
        require(_validateGemAmounts(message.catalystQuantities, message.gemQuantities), "INVALID_GEMS");
        bytes32 hashedData = keccak256(abi.encodePacked(catalystIds, catalystQuantities, gemIds, gemQuantities, buyer, nonce));

        address signer = SigUtil.recover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hashedData)), signature);
        return signer == _signingWallet;
    }

    function _checkAndUpdateNonce(address _buyer, uint256 _packedValue) private returns (bool) {
        uint128 queueId = uint128(_packedValue / 2**128);
        uint128 nonce = uint128(_packedValue % 2**128);
        uint128 currentNonce = queuedNonces[_buyer][queueId];
        if (nonce == currentNonce) {
            queuedNonces[_buyer][queueId] = currentNonce + 1;
            return true;
        }
        return false;
    }

    function _validateGemAmounts(uint256[] memory _catalystQuantities, uint256[] memory _gemQuantities) private returns (bool) {
        uint256 requestedGems;
        uint256 maxGemsAllowed;
        for (uint256 i = 0; i < _gemQuantities.length; i++) {
            requestedGems += _gemQuantities[i];
        }
        for (uint256 i = 0; i < _catalystQuantities.length; i++) {
            maxGemsAllowed += _catalystQuantities[i] * (i + 1);
        }
        return (requestedGems <= maxGemsAllowed);
    }

    constructor(address initialSigningWallet) public {
        _signingWallet = initialSigningWallet;
    }
}
