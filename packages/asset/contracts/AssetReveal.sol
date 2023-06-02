//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "./libraries/TokenIdUtils.sol";
import "./AuthValidator.sol";
import "./ERC2771Handler.sol";
import "./interfaces/IAsset.sol";
import "./interfaces/IAssetReveal.sol";

/// @title AssetReveal
/// @author The Sandbox
/// @notice Contract for burning and revealing assets
contract AssetReveal is
    IAssetReveal,
    Initializable,
    ERC2771Handler,
    EIP712Upgradeable
{
    using TokenIdUtils for uint256;
    IAsset private assetContract;
    AuthValidator private authValidator;

    // mapping of creator to asset id to asset's reveal nonce
    mapping(address => mapping(uint256 => uint16)) revealNonces;

    string public constant name = "Sandbox Asset Reveal";
    string public constant version = "1.0";

    bytes32 public constant REVEAL_TYPEHASH =
        keccak256(
            "Reveal(uint256 prevTokenId,uint256[] amounts,string[] metadataHashes)"
        );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the contract
    /// @param _assetContract The address of the asset contract
    /// @param _authValidator The address of the AuthValidator contract
    /// @param _forwarder The address of the forwarder contract
    function initialize(
        address _assetContract,
        address _authValidator,
        address _forwarder
    ) public initializer {
        assetContract = IAsset(_assetContract);
        authValidator = AuthValidator(_authValidator);
        __ERC2771Handler_initialize(_forwarder);
        __EIP712_init(name, version);
    }

    /// @notice Reveal an asset to view its abilities and enhancements
    /// @dev the reveal mechanism works through burning the asset and minting a new one with updated tokenId
    /// @param tokenId the tokenId of id idasset to reveal
    /// @param amount the amount of tokens to reveal
    function revealBurn(uint256 tokenId, uint256 amount) public {
        require(amount > 0, "Amount should be greater than 0");
        IAsset.AssetData memory data = tokenId.getData();
        require(!data.revealed, "Asset is already revealed");
        assetContract.burnFrom(_msgSender(), tokenId, amount);
        emit AssetRevealBurn(
            _msgSender(),
            tokenId,
            data.creator,
            data.tier,
            data.creatorNonce,
            amount
        );
    }

    /// @notice Burn multiple assets to be able to reveal them later
    /// @dev Can be used to burn multiple copies of the same token id, each copy will be revealed separately
    /// @param tokenIds the tokenIds of the assets to burn
    /// @param amounts the amounts of the assets to burn
    function revealBatchBurn(
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) external {
        require(tokenIds.length == amounts.length, "Invalid input");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            revealBurn(tokenIds[i], amounts[i]);
        }
    }

    /// @notice Reveal assets to view their abilities and enhancements
    /// @dev Can be used to reveal multiple copies of the same token id
    /// @param signature Signature created on the TSB backend containing REVEAL_TYPEHASH and associated data, must be signed by authorized signer
    /// @param prevTokenId The tokenId of the unrevealed asset
    /// @param amounts The amount of assets to reveal (must be equal to the length of revealHashes)
    /// @param metadataHashes The array of hashes for asset metadata
    /// @param recipient The recipient of the revealed assets
    function revealMint(
        bytes memory signature,
        uint256 prevTokenId,
        uint256[] calldata amounts,
        string[] calldata metadataHashes,
        address recipient
    ) public {
        require(
            authValidator.verify(
                signature,
                _hashReveal(prevTokenId, amounts, metadataHashes)
            ),
            "Invalid signature"
        );

        require(amounts.length == metadataHashes.length, "Invalid amount");

        uint256[] memory tokenIds = getRevealedTokenIds(
            amounts,
            metadataHashes,
            prevTokenId
        );

        if (tokenIds.length == 1) {
            assetContract.mint(
                recipient,
                tokenIds[0],
                amounts[0],
                metadataHashes[0]
            );
        } else {
            assetContract.mintBatch(
                recipient,
                tokenIds,
                amounts,
                metadataHashes
            );
        }

        emit AssetsRevealed(recipient, prevTokenId, amounts, tokenIds);
    }

    /// @notice Mint multiple assets with revealed abilities and enhancements
    /// @dev Can be used to reveal multiple copies of the same token id
    /// @param signatures Signatures created on the TSB backend containing REVEAL_TYPEHASH and associated data, must be signed by authorized signer
    /// @param prevTokenIds The tokenId of the unrevealed asset
    /// @param amounts The amount of assets to reveal (must be equal to the length of revealHashes)
    /// @param metadataHashes The array of hashes for asset metadata
    /// @param recipient The recipient of the revealed assets
    function revealBatchMint(
        bytes[] calldata signatures,
        uint256[] calldata prevTokenIds,
        uint256[][] calldata amounts,
        string[][] calldata metadataHashes,
        address recipient
    ) public {
        require(
            signatures.length == prevTokenIds.length &&
                prevTokenIds.length == amounts.length &&
                amounts.length == metadataHashes.length,
            "Invalid input"
        );
        for (uint256 i = 0; i < signatures.length; i++) {
            revealMint(
                signatures[i],
                prevTokenIds[i],
                amounts[i],
                metadataHashes[i],
                recipient
            );
        }
    }

    /// @notice Creates a hash of the reveal data
    /// @param prevTokenId The previous token id
    /// @param amounts The amount of tokens to mint
    /// @return digest The hash of the reveal data
    function _hashReveal(
        uint256 prevTokenId,
        uint256[] calldata amounts,
        string[] calldata metadataHashes
    ) internal view returns (bytes32 digest) {
        digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    REVEAL_TYPEHASH,
                    prevTokenId,
                    keccak256(abi.encodePacked(amounts)),
                    _encodeHashes(metadataHashes)
                )
            )
        );
    }

    /// @notice Encodes the hashes of the metadata for signature verification
    /// @param metadataHashes The hashes of the metadata
    /// @return encodedHashes The encoded hashes of the metadata
    function _encodeHashes(
        string[] memory metadataHashes
    ) internal pure returns (bytes32) {
        bytes32[] memory encodedHashes = new bytes32[](metadataHashes.length);
        for (uint256 i = 0; i < metadataHashes.length; i++) {
            encodedHashes[i] = keccak256((abi.encodePacked(metadataHashes[i])));
        }

        return keccak256(abi.encodePacked(encodedHashes));
    }

    function _encodeAmounts(
        uint256[] memory amounts
    ) internal pure returns (bytes32) {
        bytes32[] memory encodedAmounts = new bytes32[](amounts.length);
        for (uint256 i = 0; i < amounts.length; i++) {
            encodedAmounts[i] = keccak256(abi.encodePacked(amounts[i]));
        }

        return keccak256(abi.encodePacked(encodedAmounts));
    }

    /// @notice Checks if each metadatahash has been used before to either get the tokenId that was already created for it or generate a new one if it hasn't
    /// @dev This function also validates that we're not trying to reveal a tokenId that has already been revealed
    /// @param amounts The amounts of tokens to mint
    /// @param metadataHashes The hashes of the metadata
    /// @param prevTokenId The previous token id from which the assets are revealed
    /// @return tokenIdArray The array of tokenIds to mint
    function getRevealedTokenIds(
        uint256[] calldata amounts,
        string[] calldata metadataHashes,
        uint256 prevTokenId
    ) internal returns (uint256[] memory) {
        IAsset.AssetData memory data = prevTokenId.getData();
        require(!data.revealed, "Asset: already revealed");

        uint256[] memory tokenIdArray = new uint256[](amounts.length);
        for (uint256 i = 0; i < amounts.length; i++) {
            uint256 tokenId = assetContract.getTokenIdByMetadataHash(
                metadataHashes[i]
            );
            if (tokenId != 0) {
                tokenId = assetContract.getTokenIdByMetadataHash(
                    metadataHashes[i]
                );
            } else {
                uint16 revealNonce = ++revealNonces[data.creator][prevTokenId];
                tokenId = TokenIdUtils.generateTokenId(
                    data.creator,
                    data.tier,
                    data.creatorNonce,
                    revealNonce
                );
            }
            tokenIdArray[i] = tokenId;
        }

        return tokenIdArray;
    }

    /// @notice Get the asset contract address
    /// @return The asset contract address
    function getAssetContract() external view returns (address) {
        return address(assetContract);
    }

    /// @notice Get the auth validator address
    /// @return The auth validator address
    function getAuthValidator() external view returns (address) {
        return address(authValidator);
    }
}
