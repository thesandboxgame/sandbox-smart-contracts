//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {AccessControl, Context} from "@openzeppelin/contracts-0.8/access/AccessControl.sol";
import {EIP712, ECDSA} from "@openzeppelin/contracts-0.8/utils/cryptography/draft-EIP712.sol";

/// @title Purchase Validator contract that validates the purchase of catalysts and gems bundles with EIP712
/// @notice This contract manages the validation of purchases
/// @notice The following privileged roles are used in PurchaseValidator: DEFAULT_ADMIN_ROLE
/// @dev It is intended that this contract is inherited by StarterPack
contract PurchaseValidator is AccessControl, EIP712 {
    address private _signingWallet;

    // A parallel-queue mapping to nonces: user => (queueID => nonce)
    mapping(address => mapping(uint128 => uint128)) public queuedNonces;

    bytes32 public constant PURCHASE_TYPEHASH =
        keccak256(
            "Purchase(address buyer,uint16[] catalystIds,uint256[] catalystQuantities,uint16[] gemIds,uint256[] gemQuantities,uint256 nonce)"
        );

    event SigningWallet(address indexed newSigningWallet);

    constructor(
        address initialSigningWallet,
        string memory name,
        string memory version
    ) EIP712(name, version) {
        require(initialSigningWallet != address(0), "WALLET_ZERO_ADDRESS");
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

    /// @notice Function to get the domain separator
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /// @notice Function to get the chainId
    function getChainId() external view returns (uint256) {
        return block.chainid;
    }

    /// @notice Get the wallet authorized for signing purchase-messages.
    /// @return _signingWallet the address of the signing wallet
    function getSigningWallet() external view returns (address) {
        return _signingWallet;
    }

    /// @notice Check if a purchase message is valid by verifying a EIP712 signature for the purchase message
    /// @dev It is intended that this contract is inherited so this internal function can be used
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
        uint16[] memory catalystIds,
        uint256[] memory catalystQuantities,
        uint16[] memory gemIds,
        uint256[] memory gemQuantities,
        uint256 nonce,
        bytes memory signature
    ) internal returns (bool) {
        require(_checkAndUpdateNonce(buyer, nonce), "INVALID_NONCE");
        bytes32 digest =
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        PURCHASE_TYPEHASH,
                        buyer,
                        keccak256(abi.encodePacked(catalystIds)),
                        keccak256(abi.encodePacked(catalystQuantities)),
                        keccak256(abi.encodePacked(gemIds)),
                        keccak256(abi.encodePacked(gemQuantities)),
                        nonce
                    )
                )
            );
        address recoveredSigner = ECDSA.recover(digest, signature);
        return recoveredSigner == _signingWallet;
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
