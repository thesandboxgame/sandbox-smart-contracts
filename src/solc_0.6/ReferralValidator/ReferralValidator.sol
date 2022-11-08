/* solhint-disable not-rely-on-time, func-order */

// SPDX-License-Identifier: MIT

pragma solidity 0.6.5;

import "@openzeppelin/contracts-0.6/utils/Address.sol";
import "@openzeppelin/contracts-0.6/cryptography/ECDSA.sol";
import "@openzeppelin/contracts-0.6/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts-0.6/math/SafeMath.sol";
import "../common/BaseWithStorage/Admin.sol";


/// @dev This contract verifies if a referral is valid
contract ReferralValidator is Admin {
    using Address for address;
    using SafeERC20 for IERC20;

    address private _signingWallet;
    uint256 private _maxCommissionRate;

    mapping(address => uint256) private _previousSigningWallets;
    uint256 constant private _previousSigningDelay = 10 days;

    event ReferralUsed(
        address indexed referrer,
        address indexed referee,
        address indexed token,
        uint256 amount,
        uint256 commission,
        uint256 commissionRate
    );

    event SigningWalletUpdated(address indexed newSigningWallet);
    event MaxCommissionRateUpdated(uint256 indexed newMaxCommissionRate);

    constructor(address initialSigningWallet, uint256 initialMaxCommissionRate) public {
        require(initialSigningWallet != address(0), "ReferralValidator: zero address");

        _signingWallet = initialSigningWallet;
        _maxCommissionRate = initialMaxCommissionRate;
    }

    /**
     * @dev Update the signing wallet
     * The previous wallet is still valid for a grace period (_previousSigningDelay). If you want to
     * disable the previous wallet, use the disablePreviousSigningWallet function.
     * @param newSigningWallet The new address of the signing wallet
     */
    function updateSigningWallet(address newSigningWallet) external onlyAdmin {
        require(newSigningWallet != address(0), "ReferralValidator: zero address");
        _previousSigningWallets[_signingWallet] = now + _previousSigningDelay;
        _signingWallet = newSigningWallet;

        emit SigningWalletUpdated(newSigningWallet);
    }

     /**
     * @dev Disable compromised signing wallet
     * @param disableWallet The wallet address to be disabled
     */
    function disablePreviousSigningWallet(address disableWallet) external {
        require(_admin == msg.sender, "ReferralValidator: Sender not admin");
        require(disableWallet != address(0), "ReferralValidator: zero address");
        _previousSigningWallets[disableWallet] = 0;
    }

    /**
     * @dev signing wallet authorized for referral
     * @return the address of the signing wallet
     */
    function getSigningWallet() external view returns (address) {
        return _signingWallet;
    }

    /**
     * @notice the max commission rate
     * @return the maximum commission rate that a referral can give
     */
    function getMaxCommissionRate() external view returns (uint256) {
        return _maxCommissionRate;
    }

    /**
     * @dev Update the maximum commission rate
     * @param newMaxCommissionRate The new maximum commission rate
     */
    function updateMaxCommissionRate(uint256 newMaxCommissionRate) external onlyAdmin {
        _maxCommissionRate = newMaxCommissionRate;

        emit MaxCommissionRateUpdated(newMaxCommissionRate);
    }

    function handleReferralWithETH(
        uint256 amount,
        bytes memory referral,
        address payable destination
    ) internal {
        uint256 amountForDestination = amount;

        require(msg.value >= amount, "ReferralValidator: insufficient funds");

        if (referral.length > 0) {
            (bytes memory signature, address referrer, address referee, uint256 expiryTime, uint256 commissionRate) = decodeReferral(referral);

            require(commissionRate < 10000, "ReferralValidator: invalid commisionRate");

            uint256 commission = 0;

            if (isReferralValid(signature, referrer, referee, expiryTime, commissionRate)) {
                commission = SafeMath.div(SafeMath.mul(amount, commissionRate), 10000);

                emit ReferralUsed(referrer, referee, address(0), amount, commission, commissionRate);
                amountForDestination = SafeMath.sub(amountForDestination, commission);
            }

            if (commission > 0) {
                // solhint-disable-next-line avoid-low-level-calls
                (bool success, ) = payable(referrer).call{value:commission}("");
                require(success, "ReferralValidator: Transfer failed.");
            }
        }

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, ) = destination.call{value:amountForDestination}("");
        require(success, "ReferralValidator: Transfer failed.");
    }

    function handleReferralWithERC20(
        address buyer,
        uint256 amount,
        bytes memory referral,
        address payable destination,
        address tokenAddress
    ) internal {
        IERC20 token = IERC20(tokenAddress);
        uint256 amountForDestination = amount;

        if (referral.length > 0) {
            (bytes memory signature, address referrer, address referee, uint256 expiryTime, uint256 commissionRate) = decodeReferral(referral);

            uint256 commission = 0;

            if (isReferralValid(signature, referrer, referee, expiryTime, commissionRate)) {
                commission = SafeMath.div(SafeMath.mul(amount, commissionRate), 10000);

                emit ReferralUsed(referrer, referee, tokenAddress, amount, commission, commissionRate);
                amountForDestination = SafeMath.sub(amountForDestination, commission);
            }

            if (commission > 0) {
                token.safeTransferFrom(buyer, referrer, commission);
            }
        }

        token.safeTransferFrom(buyer, destination, amountForDestination);
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
    ) public view returns (bool) {
        if (commissionRate > _maxCommissionRate || referrer == referee || now > expiryTime) {
            return false;
        }

        bytes32 hashedData = keccak256(abi.encodePacked(referrer, referee, expiryTime, commissionRate));

        address signer = ECDSA.recover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hashedData)), signature);

        if (_previousSigningWallets[signer] >= now) {
            return true;
        }

        return _signingWallet == signer;
    }

    function decodeReferral(bytes memory referral)
        public
        pure
        returns (
            bytes memory,
            address,
            address,
            uint256,
            uint256
        )
    {
        (bytes memory signature, address referrer, address referee, uint256 expiryTime, uint256 commissionRate) = abi.decode(
            referral,
            (bytes, address, address, uint256, uint256)
        );

        return (signature, referrer, referee, expiryTime, commissionRate);
    }
}
