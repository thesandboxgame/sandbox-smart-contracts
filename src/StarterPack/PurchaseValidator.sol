pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "../contracts_common/src/Libraries/SigUtil.sol";
import "../contracts_common/src/BaseWithStorage/Admin.sol";


contract PurchaseValidator is Admin {
    address private _signingWallet;

    struct Message {
        uint256[] catalystIds;
        uint256[] catalystQuantities;
        uint256[] gemIds;
        uint256[] gemQuantities;
        address buyer;
        uint256 nonce;
    }

    /**
     * @notice Check if a purchase message is valid
     * @param from The tx sender
     * @param message The specific parameters signed
     * by the backend, of type "Message"
     * @param signature A signed message specifying tx details
     * @return True if the referral is valid
     */
    function isPurchaseValid(
        address from,
        Message memory message,
        bytes memory signature
    ) public view returns (bool) {
        bytes32 hashedData = keccak256(
            abi.encodePacked(message.catalystIds, message.catalystQuantities, message.gemIds, message.gemQuantities, message.buyer, message.nonce)
        );

        address signer = SigUtil.recover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hashedData)), signature);

        return signer == _signingWallet;
    }

    constructor(address initialSigningWallet) public {
        _signingWallet = initialSigningWallet;
    }
}
