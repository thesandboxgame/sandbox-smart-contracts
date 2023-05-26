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
            "Reveal(address creator,uint256 prevTokenId, uint256 amount,string[] metadataHashes)"
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
        require(!data.revealed, "Token is already revealed");
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
    /// @param creator The original creator of the assets
    /// @param prevTokenId The tokenId of the unrevealed asset
    /// @param amount The amount of assets to reveal (must be equal to the length of revealHashes)
    /// @param metadataHashes The array of hashes for asset metadata
    /// @param recipient The recipient of the revealed assets
    function revealMint(
        bytes memory signature,
        address creator,
        uint256 prevTokenId,
        uint256 amount,
        string[] memory metadataHashes,
        address recipient
    ) public {
        require(
            authValidator.verify(
                signature,
                _hashReveal(creator, prevTokenId, amount, metadataHashes)
            ),
            "Invalid signature"
        );

        IAsset.AssetData memory data = prevTokenId.getData();
        require(!data.revealed, "Asset: already revealed");
        require(
            data.creator == creator,
            "Asset: creator does not match prevTokenId"
        );
        require(amount == metadataHashes.length, "Invalid amount");

        uint256[] memory tokenIdArray = new uint256[](amount);
        uint256[] memory tokenCountArray = new uint256[](amount);
        uint256 uniqueTokenCount = 0;

        // for each asset, set the data
        for (uint256 i = 0; i < amount; i++) {
            uint256 tokenId;
            if (
                assetContract.getTokenIdByMetadataHash(metadataHashes[i]) != 0
            ) {
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

                assetContract.setMetadataHashUsed(tokenId, metadataHashes[i]);
            }
            // Check if the tokenId already exists in the array
            bool exists = false;
            for (uint256 j = 0; j < uniqueTokenCount; j++) {
                if (tokenIdArray[j] == tokenId) {
                    tokenCountArray[j]++;
                    exists = true;
                    break;
                }
            }

            // If it doesn't exist, add it to the array and increase the count
            if (!exists) {
                tokenIdArray[uniqueTokenCount] = tokenId;
                tokenCountArray[uniqueTokenCount]++;
                uniqueTokenCount++;
            }
        }

        // Copy over the unique tokenIds and their counts to new arrays of the correct length
        uint256[] memory newTokenIds = new uint256[](uniqueTokenCount);
        uint256[] memory newAmounts = new uint256[](uniqueTokenCount);

        for (uint256 k = 0; k < uniqueTokenCount; k++) {
            newTokenIds[k] = tokenIdArray[k];
            newAmounts[k] = tokenCountArray[k];
        }

        if (uniqueTokenCount == 1) {
            assetContract.mint(recipient, newTokenIds[0], newAmounts[0]);
        } else {
            assetContract.mintBatch(recipient, newTokenIds, newAmounts);
        }

        emit AssetsRevealed(recipient, creator, prevTokenId, newTokenIds);
    }

    /// @notice Mint multiple assets with revealed abilities and enhancements
    /// @dev Can be used to reveal multiple copies of the same token id
    /// @param signatures Signatures created on the TSB backend containing REVEAL_TYPEHASH and associated data, must be signed by authorized signer
    /// @param creators The original creator of the assets
    /// @param prevTokenIds The tokenId of the unrevealed asset
    /// @param amounts The amount of assets to reveal (must be equal to the length of revealHashes)
    /// @param metadataHashes The array of hashes for asset metadata
    /// @param recipient The recipient of the revealed assets
    function revealBatchMint(
        bytes[] memory signatures,
        address[] memory creators,
        uint256[] memory prevTokenIds,
        uint256[] memory amounts,
        string[][] memory metadataHashes,
        address recipient
    ) public {
        require(
            signatures.length == creators.length &&
                creators.length == prevTokenIds.length &&
                prevTokenIds.length == amounts.length &&
                amounts.length == metadataHashes.length,
            "Invalid input"
        );
        for (uint256 i = 0; i < signatures.length; i++) {
            revealMint(
                signatures[i],
                creators[i],
                prevTokenIds[i],
                amounts[i],
                metadataHashes[i],
                recipient
            );
        }
    }

    /// @notice Creates a hash of the reveal data
    /// @param creator The creator of the asset
    /// @param prevTokenId The previous token id
    /// @param amount The amount of tokens to mint
    /// @return digest The hash of the reveal data
    function _hashReveal(
        address creator,
        uint256 prevTokenId,
        uint256 amount,
        string[] memory metadataHashes
    ) internal view returns (bytes32 digest) {
        digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    REVEAL_TYPEHASH,
                    creator,
                    prevTokenId,
                    amount,
                    metadataHashes
                )
            )
        );
    }
}
