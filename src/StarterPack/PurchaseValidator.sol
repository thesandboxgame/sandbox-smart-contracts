pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "../contracts_common/src/Libraries/SigUtil.sol";
import "../contracts_common/src/BaseWithStorage/Admin.sol";


contract PurchaseValidator is Admin {
    address private _signingWallet;

    // A parallel-queue mapping to nonces.
    mapping(address => mapping(uint128 => uint128)) public queuedNonces;

    struct Message {
        uint256[] catalystIds;
        uint256[] catalystQuantities;
        uint256[] gemIds;
        uint256[] gemQuantities;
        address buyer;
        uint256 nonce;
    }

    function getNonceByBuyer(address _buyer, uint128 _queueId) external view returns (uint128) {
        return queuedNonces[_buyer][_queueId];
    }

    /**
     * @notice Check if a purchase message is valid
     * @param from The tx sender
     * @param message The specific parameters signed
     * by the backend, of type "Message"
     * @param signature A signed message specifying tx details
     * @return True if the purchase is valid
     */
    function isPurchaseValid(
        address from,
        Message memory message,
        bytes memory signature
    ) public returns (bool) {
        require(from == message.buyer, "INVALID_SENDER");
        require(checkAndUpdateNonce(message.buyer, message.nonce), "INVALID_NONCE");
        bytes32 hashedData = keccak256(
            abi.encodePacked(message.catalystIds, message.catalystQuantities, message.gemIds, message.gemQuantities, message.buyer, message.nonce)
        );

        address signer = SigUtil.recover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hashedData)), signature);
        return signer == _signingWallet;
    }

    function checkAndUpdateNonce(address _buyer, uint256 _packedValue) private returns (bool) {
        uint128 queueId = uint128(_packedValue / 2**128);
        uint128 nonce = uint128(_packedValue % 2**128);
        uint128 currentNonce = queuedNonces[_buyer][queueId];
        if (nonce == currentNonce) {
            queuedNonces[_buyer][queueId] = currentNonce + 1;
            return true;
        }
        return false;
    }

    constructor(address initialSigningWallet) public {
        _signingWallet = initialSigningWallet;
    }
}
