// SPDX-License-Identifier: MIT

pragma solidity 0.8.26;

import {ECDSA} from "@openzeppelin/contracts-5.0.2/utils/cryptography/ECDSA.sol";

/**
 * @title NFTCollectionSignature
 * @author The Sandbox
 * @custom:security-contact contact-blockchain@sandbox.game
 * @notice Signatures accepted by the NFTCollection
 * @dev We have a set of different signatures to be backward compatible with previous collections
 * @dev To guarantee that signatures are unique and cannot be reused across different methods,
 * @dev a constant string is appended to distinguish "reveal" and "personalize" signatures from "mint" signatures.
 * @dev mint:           ['address', 'uint256', 'address', 'uint256']
 * @dev reveal:         ['address', 'uint256', 'address', 'uint256', 'string']
 * @dev personalize:    ['address', 'uint256', 'address', 'uint256', 'uint256', 'uint256', 'string']
 * @dev waveMint:       ['address', 'uint256', 'uint256', 'address', 'uint256']
 */
abstract contract NFTCollectionSignature {
    enum SignatureType {
        Unused,
        Mint,
        Personalization,
        Reveal,
        WaveMint
    }

    /// @custom:storage-location erc7201:thesandbox.storage.avatar.nft-collection.NFTCollectionSignature
    struct NFTCollectionSignatureStorage {

        /**
          * @notice all signatures must come from this specific address, otherwise they are invalid
          */
        address signAddress;

        /**
         * @notice map used to mark if a specific signatureId was used
         *      values are 0 (default, unused) and 1 (used)
         *      Used to avoid a signature reuse
         */
        mapping(uint256 => SignatureType) signatureIds;
    }

    /**
     * @notice Event emitted when the signer address was set or changed
     * @dev emitted when setSignAddress is called
     * @param operator the sender of the transaction
     * @param oldSignAddress old signer address that is allowed to create mint signatures
     * @param newSignAddress new signer address that is allowed to create mint signatures
     */
    event SignAddressSet(address indexed operator, address indexed oldSignAddress, address indexed newSignAddress);

    /**
     * @notice The operation failed because signature is invalid or it was already used
     * @param signatureId the ID of the provided signature
     */
    error InvalidSignature(uint256 signatureId);

    /**
     * @notice The operation failed because the signAddress is wrong
     * @param signAddress signer address that is allowed to create mint signatures
     */
    error InvalidSignAddress(address signAddress);

    // keccak256(abi.encode(uint256(keccak256("thesandbox.storage.avatar.nft-collection.NFTCollectionSignature")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 internal constant NFT_COLLECTION_SIGNATURE_STORAGE_LOCATION =
    0x40778db7ee4c29e622e04906f2c4ade86f805ca9734a7b64bb0f84f333357900;

    function _getNFTCollectionSignatureStorage() private pure returns (NFTCollectionSignatureStorage storage $) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            $.slot := NFT_COLLECTION_SIGNATURE_STORAGE_LOCATION
        }
    }

    /**
      * @notice return the address from which all signatures must come from this specific address, otherwise they are invalid
      * @return the signer address
      */
    function signAddress() external view returns (address) {
        NFTCollectionSignatureStorage storage $ = _getNFTCollectionSignatureStorage();
        return $.signAddress;
    }

    /**
     * @notice returns the type of signature used for a specific Id
     * @param signatureId signing signature ID
     * @return the type of signature used
     */
    function getSignatureType(uint256 signatureId) external view returns (SignatureType) {
        NFTCollectionSignatureStorage storage $ = _getNFTCollectionSignatureStorage();
        return $.signatureIds[signatureId];
    }

    /**
     * @notice updates the sign address.
     * @param _signAddress new signer address to be set
     */
    function _setSignAddress(address _signAddress) internal {
        NFTCollectionSignatureStorage storage $ = _getNFTCollectionSignatureStorage();
        if (_signAddress == address(0)) {
            revert InvalidSignAddress(_signAddress);
        }
        emit SignAddressSet(_msgSender(), $.signAddress, _signAddress);
        $.signAddress = _signAddress;
    }

    /**
     * @notice checks that the provided signature is valid, while also taking into
     *         consideration the provided address and signatureId.
     * @param wallet address to be used in validating the signature
     * @param signatureId signing signature ID
     * @param signature signing signature value
     */
    function _checkAndSetMintSignature(
        address wallet,
        uint256 signatureId,
        bytes calldata signature
    ) internal {
        NFTCollectionSignatureStorage storage $ = _getNFTCollectionSignatureStorage();
        if ($.signatureIds[signatureId] != SignatureType.Unused
            || _getMintSignature(wallet, signatureId, address(this), block.chainid, signature) != $.signAddress) {
            revert InvalidSignature(signatureId);
        }
        $.signatureIds[signatureId] = SignatureType.Mint;
    }

    /**
     * @notice checks that the provided signature is valid, while also taking into
     *         consideration the provided address and signatureId.
     * @param wallet address to be used in validating the signature
     * @param waveIndex the index of the wave that is used to mint
     * @param signatureId signing signature ID
     * @param signature signing signature value
     */
    function _checkAndSetWaveMintSignature(
        address wallet,
        uint256 waveIndex,
        uint256 signatureId,
        bytes calldata signature
    ) internal {
        NFTCollectionSignatureStorage storage $ = _getNFTCollectionSignatureStorage();
        if ($.signatureIds[signatureId] != SignatureType.Unused
            || _getWaveMintSignature(wallet, waveIndex, signatureId, address(this), block.chainid, signature) != $.signAddress) {
            revert InvalidSignature(signatureId);
        }
        $.signatureIds[signatureId] = SignatureType.WaveMint;
    }

    /**
     * @notice checks that the provided signature is valid, while also taking into
     *         consideration the provided address and signatureId.
     * @param wallet address to be used in validating the signature
     * @param signatureId signing signature ID
     * @param signature signing signature value
     */
    function _checkAndSetRevealSignature(
        address wallet,
        uint256 signatureId,
        bytes calldata signature
    ) internal {
        NFTCollectionSignatureStorage storage $ = _getNFTCollectionSignatureStorage();
        if ($.signatureIds[signatureId] != SignatureType.Unused
            || _getRevealSignature(wallet, signatureId, address(this), block.chainid, signature) != $.signAddress) {
            revert InvalidSignature(signatureId);
        }
        $.signatureIds[signatureId] = SignatureType.Reveal;
    }

    /**
     * @notice checks that the provided personalization signature is valid, while also taking into
     *         consideration the provided address and signatureId.
     * @param wallet address to be used in validating the signature
     * @param signatureId signing signature ID
     * @param signature signing signature value
     * @param tokenId what token to personalize
     * @param personalizationMask a mask where each bit has a custom meaning in-game
     */
    function _checkAndSetPersonalizationSignature(
        address wallet,
        uint256 tokenId,
        uint256 personalizationMask,
        uint256 signatureId,
        bytes calldata signature
    ) internal {
        NFTCollectionSignatureStorage storage $ = _getNFTCollectionSignatureStorage();
        if ($.signatureIds[signatureId] != SignatureType.Unused ||
            _getPersonalizationSignature(
                wallet,
                signatureId,
                address(this),
                block.chainid,
                tokenId,
                personalizationMask,
                signature
            ) != $.signAddress) {
            revert InvalidSignature(signatureId);
        }
        $.signatureIds[signatureId] = SignatureType.Personalization;
    }

    /**
     * @notice get the address related to mint the signature
     * @param wallet wallet that was used in signature generation
     * @param signatureId id of signature
     * @param contractAddress contract address that was used in signature generation
     * @param chainId chain ID for which the signature was generated
     * @param signature signature
     * @return address that validates the provided signature
     */
    function _getMintSignature(
        address wallet,
        uint256 signatureId,
        address contractAddress,
        uint256 chainId,
        bytes calldata signature
    ) internal pure returns (address) {
        return
            ECDSA.recover(
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    keccak256(abi.encode(wallet, signatureId, contractAddress, chainId))
                )
            ),
            signature
        );
    }

    /**
     * @notice get the address related to the reveal signature
     * @param wallet wallet that was used in signature generation
     * @param signatureId id of signature
     * @param contractAddress contract address that was used in signature generation
     * @param chainId chain ID for which the signature was generated
     * @param signature signature
     * @return address that validates the provided signature
     */
    function _getRevealSignature(
        address wallet,
        uint256 signatureId,
        address contractAddress,
        uint256 chainId,
        bytes calldata signature
    ) internal pure returns (address) {
        /// @dev the string "reveal" is to distinguish it from the minting signature.
        return
            ECDSA.recover(
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    keccak256(abi.encode(wallet, signatureId, contractAddress, chainId, "reveal"))
                )
            ),
            signature
        );
    }

    /**
     * @notice get the address related to the personalization signature
     * @param wallet wallet that was used in signature generation
     * @param signatureId id of signature
     * @param contractAddress contract address that was used in signature generation
     * @param chainId chain ID for which the signature was generated
     * @param tokenId token ID for which the signature was generated
     * @param personalizationMask a mask where each bit has a custom meaning in-game
     * @param signature signature
     * @return address that validates the provided signature
     */
    function _getPersonalizationSignature(
        address wallet,
        uint256 signatureId,
        address contractAddress,
        uint256 chainId,
        uint256 tokenId,
        uint256 personalizationMask,
        bytes calldata signature
    ) internal pure returns (address) {
        return
            ECDSA.recover(
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    keccak256(
                        abi.encode(
                            wallet,
                            signatureId,
                            contractAddress,
                            chainId,
                            tokenId,
                            personalizationMask,
                            "personalization"
                        )
                    )
                )
            ),
            signature
        );
    }

    /**
     * @notice get the address related to the wave mint signature
     * @param wallet wallet that was used in signature generation
     * @param waveIndex the index of the wave that is used to mint
     * @param signatureId id of signature
     * @param contractAddress contract address that was used in signature generation
     * @param chainId chain ID for which the signature was generated
     * @param signature signature
     * @return address that validates the provided signature
     */
    function _getWaveMintSignature(
        address wallet,
        uint256 waveIndex,
        uint256 signatureId,
        address contractAddress,
        uint256 chainId,
        bytes calldata signature
    ) internal pure returns (address) {
        return
            ECDSA.recover(
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    keccak256(
                        abi.encode(
                            wallet,
                            waveIndex,
                            signatureId,
                            contractAddress,
                            chainId
                        )
                    )
                )
            ),
            signature
        );
    }

    /**
     * @notice ERC2771 compatible msg.sender getter
     * @return sender msg.sender
     */
    function _msgSender() internal view virtual returns (address);
}
