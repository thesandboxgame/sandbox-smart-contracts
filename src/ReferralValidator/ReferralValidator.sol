/* solhint-disable not-rely-on-time */

pragma solidity 0.5.9;

import "../../contracts_common/src/Libraries/SigUtil.sol";


contract ReferralValidator {
    address private sandboxWallet;
    uint256 private maxCommissionRate = 20;

    constructor(
        address initialSandboxWallet
    ) public {
        sandboxWallet = initialSandboxWallet;
    }

    function isReferralValid(
        bytes calldata signature,
        address referrer,
        address referee,
        uint256 expiryTime,
        uint256 commissionRate
    ) external view returns (
        bool
    ) {
        require(
            commissionRate <= maxCommissionRate,
            "Invalid rate"
        );

        require(
            referrer != referee,
            "Invalid referee"
        );

        require(
            expiryTime > now,
            "Expired"
        );

        bytes32 hashedData = keccak256(
            abi.encodePacked(
                referrer,
                referee,
                expiryTime,
                commissionRate
            )
        );

        address signer = SigUtil.recover(
            keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", hashedData)
            ),
            signature
        );

        return sandboxWallet == signer;
    }
}
