/* solhint-disable not-rely-on-time */

pragma solidity 0.5.9;

import "../../contracts_common/src/Libraries/SigUtil.sol";
import "../../contracts_common/src/Libraries/SafeMathWithRequire.sol";


/**
 * @title Referral Validator
 * @notice This contract verifies if a referral is valid
 */
contract ReferralValidator {
    address private _admin;
    address private _signingWallet;
    uint256 private _maxCommissionRate;

    mapping (address => uint256) private _previousSigningWallets;
    uint256 private _previousSigningDelay = 60 * 60 * 24 * 10;

    event ReferralUsed(
        address indexed referrer,
        address indexed referee,
        uint256 ETHRequired,
        uint256 commission,
        uint256 commissionRate
    );

    constructor(
        address initialSigningWallet,
        uint256 initialMaxCommissionRate
    ) public {
        _signingWallet = initialSigningWallet;
        _maxCommissionRate = initialMaxCommissionRate;
        _admin = msg.sender;
    }

    /**
     * @notice Update the admin
     * @param newAdmin The new address of the admin
     */
    function updateAdmin(address newAdmin) external {
        require(_admin == msg.sender, "Sender not admin");
        require(newAdmin != address(0), "Invalid address");
        _admin = newAdmin;
    }

    /**
     * @notice Update the signing wallet
     * @param newSigningWallet The new address of the signing wallet
     */
    function updateSigningWallet(address newSigningWallet) external {
        require(_admin == msg.sender, "Sender not admin");
        _previousSigningWallets[_signingWallet] = now + _previousSigningDelay;
        _signingWallet = newSigningWallet;
    }

    // TODO: Check if this function is really useful
    /**
     * @notice Update the maximum commission rate
     * @param newMaxCommissionRate The new maximum commission rate
     */
    function updateMaxCommissionRate(uint256 newMaxCommissionRate) external {
        require(_admin == msg.sender, "Sender not admin");
        _maxCommissionRate = newMaxCommissionRate;
    }

    function recordReferral(
        uint256 ETHRequired,
        bytes memory referral
    ) internal returns (
        uint256,
        address
    ) {
        (
            bytes memory signature,
            address referrer,
            address referee,
            uint256 expiryTime,
            uint256 commissionRate
        ) = decodeReferral(referral);

        if (isReferralValid(signature, referrer, referee, expiryTime, commissionRate)) {
            uint256 commission = SafeMathWithRequire.div(
                SafeMathWithRequire.mul(ETHRequired, commissionRate),
                10000
            );

            emit ReferralUsed(
                referrer,
                referee,
                ETHRequired,
                commission,
                commissionRate
            );

            return (commission, referrer);
        }

        return (0, address(0));
    }

    /**
     * @notice Check if a referral is valid
     * @param signature The signature to check (signed referral)
     * @param referrer The address of the referrer
     * @param referee The address of the referee
     * @param expiryTime The expiry time of the referral
     * @param commissionRate The commissionRate of the referral
     * @return True if the referral is valid
     */
    function isReferralValid(
        bytes memory signature,
        address referrer,
        address referee,
        uint256 expiryTime,
        uint256 commissionRate
    ) public view returns (
        bool
    ) {
        if (commissionRate > _maxCommissionRate || referrer == referee || now > expiryTime) {
            return false;
        }

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

        if (_previousSigningWallets[signer] >= now) {
            return true;
        }

        return _signingWallet == signer;
    }

    function encodeReferral(
        bytes memory signature,
        address referrer,
        address referee,
        uint256 expiryTime,
        uint256 commissionRate
    ) public pure returns (bytes memory) {
        return abi.encodePacked(
            signature,
            referrer,
            referee,
            expiryTime,
            commissionRate
        );
    }

    function decodeReferral(
        bytes memory referral
    ) public pure returns (
        bytes memory,
        address,
        address,
        uint256,
        uint256
    ) {
        (
            bytes memory signature,
            address referrer,
            address referee,
            uint256 expiryTime,
            uint256 commissionRate
        ) = abi.decode(referral, (bytes, address, address, uint256, uint256));

        return (
            signature,
            referrer,
            referee,
            expiryTime,
            commissionRate
        );
    }
}
