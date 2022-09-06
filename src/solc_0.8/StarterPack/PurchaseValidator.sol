pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/access/AccessControl.sol";
import "../common/Libraries/SigUtil.sol";

/// @title Purchase Validator contract that validates the purchase of catalysts and gems bundles.
/// @notice This contract manages the validation of purchases.
/// @dev It is intended that this contract is inherited by StarterPack.
contract PurchaseValidator is AccessControl {
    address private _signingWallet;

    // A parallel-queue mapping to nonces.
    mapping(address => mapping(uint128 => uint128)) public queuedNonces;

    event SigningWallet(address indexed newSigningWallet);

    constructor(address initialSigningWallet) {
        _signingWallet = initialSigningWallet;
    }

    /// @notice Update the signing wallet address
    /// @param newSigningWallet The new address of the signing wallet
    function setSigningWallet(address newSigningWallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newSigningWallet != address(0), "WALLET_ZERO_ADDRESS");
        require(newSigningWallet != _signingWallet, "WALLET_ALREADY_SET");
        _signingWallet = newSigningWallet;
        emit SigningWallet(newSigningWallet);
    }

    /// @notice Function to get the nonce for a given address and queue ID
    /// @param _buyer The address of the starterPack purchaser
    /// @param _queueId The ID of the nonce queue for the given address.
    /// The default is queueID=0, and the max is queueID=2**128-1
    /// @return uint128 representing the requested nonce
    function getNonceByBuyer(address _buyer, uint128 _queueId) external view returns (uint128) {
        return queuedNonces[_buyer][_queueId];
    }

    /// @notice Check if a purchase message is valid
    /// @dev Intended to inherit contract to use this internal function.
    /// @param buyer The address paying for the purchase & receiving tokens
    /// @param catalystIds The catalyst IDs to be purchased
    /// @param catalystQuantities The quantities of the catalysts to be purchased
    /// @param gemIds The gem IDs to be purchased
    /// @param gemQuantities The quantities of the gems to be purchased
    /// @param nonce The current nonce for the user. This is represented as a
    /// uint256 value, but is actually 2 packed uint128's (queueId + nonce)
    /// @param signature A signed message specifying tx details
    /// @return true if the purchase is valid
    function _isPurchaseValid(
        address buyer,
        uint256[] memory catalystIds,
        uint256[] memory catalystQuantities,
        uint256[] memory gemIds,
        uint256[] memory gemQuantities,
        uint256 nonce,
        bytes memory signature
    ) internal returns (bool) {
        require(_checkAndUpdateNonce(buyer, nonce), "INVALID_NONCE");
        bytes32 hashedData =
            keccak256(abi.encodePacked(catalystIds, catalystQuantities, gemIds, gemQuantities, buyer, nonce));

        address signer =
            SigUtil.recover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hashedData)), signature);
        return signer == _signingWallet;
    }

    /// @notice Get the wallet authorized for signing purchase-messages.
    /// @return _signingWallet the address of the signing wallet
    function getSigningWallet() external view returns (address) {
        return _signingWallet;
    }

    /// @dev Function for validating the nonce for a user.
    /// @param _buyer The address for which we want to check the nonce
    /// @param _packedValue The queueId + nonce, packed together.
    /// @return bool Whether the nonce is valid.
    /// EG: for queueId=42 nonce=7, pass: "0x0000000000000000000000000000002A00000000000000000000000000000007"
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
}
