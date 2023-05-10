//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";

import "./ERC2771Handler.sol";
import "./interfaces/IAsset.sol";
import "./interfaces/IAssetMinter.sol";
import "./interfaces/ICatalyst.sol";

/// @title AssetMinter
/// @notice This contract is used as a user facing contract used to mint assets
contract AssetMinter is
    Initializable,
    IAssetMinter,
    EIP712Upgradeable,
    ERC2771Handler,
    AccessControlUpgradeable
{
    address public assetContract;
    address public catalystContract;
    bytes32 public constant REVEAL_TYPEHASH =
        keccak256(
            "Reveal(address creator,uint256 prevTokenId, uint256 amount, uint40[] calldata revealHashes)"
        );
    bytes32 public constant MINT_TYPEHASH =
        keccak256("Mint(MintableAsset mintableAsset)");
    bytes32 public constant MINT_BATCH_TYPEHASH =
        keccak256("MintBatch(MintableAsset[] mintableAssets)");

    string public constant name = "Sandbox Asset Minter";
    string public constant version = "1.0";
    mapping(address => bool) public bannedCreators;
    mapping(uint256 => address) public voxelCreators;

    bytes32 public constant EXCLUSIVE_MINTER_ROLE =
        keccak256("EXCLUSIVE_MINTER_ROLE");
    bytes32 public constant BACKEND_SIGNER_ROLE =
        keccak256("BACKEND_SIGNER_ROLE");

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _forwarder,
        address _assetContract,
        address _catalystContract,
        address _exclusiveMinter,
        address _backendSigner
    ) external initializer {
        __AccessControl_init();
        __ERC2771Handler_initialize(_forwarder);
        __EIP712_init(name, version);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EXCLUSIVE_MINTER_ROLE, _exclusiveMinter);
        _grantRole(BACKEND_SIGNER_ROLE, _backendSigner);
        assetContract = _assetContract;
        catalystContract = _catalystContract;
    }

    /// @notice Mints a new asset, the asset is minted to the caller of the function, the caller must have enough catalysts to mint the asset
    /// @dev The amount of catalysts owned by the caller must be equal or greater than the amount of tokens being minted
    /// @param signature Signature created on the TSB backend containing MINT_TYPEHASH and MintableAsset data, must be signed by authorized signer
    /// @param mintableAsset The asset to mint
    function mintAsset(
        bytes memory signature,
        MintableAsset memory mintableAsset
    ) external {
        address creator = _msgSender();
        require(creator == mintableAsset.creator, "Creator mismatch");
        require(!bannedCreators[creator], "Creator is banned");

        // verify signature
        require(
            _verify(signature, _hashMint(mintableAsset)),
            "Invalid signature"
        );

        // amount must be > 0
        require(mintableAsset.amount > 0, "Amount must be > 0");
        // tier must be > 0
        require(mintableAsset.tier > 0, "Tier must be > 0");
        // burn the catalysts
        require(mintableAsset.voxelHash != 0, "Voxel hash must be non-zero");
        if (voxelCreators[mintableAsset.voxelHash] == address(0)) {
            voxelCreators[mintableAsset.voxelHash] = creator;
        } else {
            require(
                voxelCreators[mintableAsset.voxelHash] == creator,
                "Voxel hash already used"
            );
        }
        ICatalyst(catalystContract).burnFrom(
            creator,
            mintableAsset.tier,
            mintableAsset.amount
        );

        // assets with catalyst id 0 - TSB Exclusive and 1 - Common are already revealed
        bool mintAsRevealed = !(mintableAsset.tier > 1);

        IAsset.AssetData memory assetData = IAsset.AssetData(
            creator,
            mintableAsset.amount,
            mintableAsset.tier,
            mintableAsset.creatorNonce,
            mintAsRevealed,
            0
        );

        IAsset(assetContract).mint(assetData);
    }

    /// @notice Mints a batch of new assets, the assets are minted to the caller of the function, the caller must have enough catalysts to mint the assets
    /// @dev The amount of catalysts owned by the caller must be equal or greater than the amount of tokens being minted
    /// @param signature Signature created on the TSB backend containing MINT_BATCH_TYPEHASH and MintableAsset[] data, must be signed by authorized signer
    /// @param mintableAssets The assets to mint
    function mintAssetBatch(
        bytes memory signature,
        MintableAsset[] memory mintableAssets
    ) external {
        address creator = _msgSender();
        require(!bannedCreators[creator], "Creator is banned");

        // verify signature
        require(
            _verify(signature, _hashMintBatch(mintableAssets)),
            "Invalid signature"
        );

        IAsset.AssetData[] memory assets = new IAsset.AssetData[](
            mintableAssets.length
        );
        uint256[] memory catalystsToBurn = new uint256[](mintableAssets.length);
        for (uint256 i = 0; i < mintableAssets.length; ) {
            require(creator == mintableAssets[i].creator, "Creator mismatch");
            require(mintableAssets[i].amount > 0, "Amount must be > 0");

            // tier must be > 0
            require(mintableAssets[i].tier > 0, "Tier must be > 0");
            if (voxelCreators[mintableAssets[i].voxelHash] == address(0)) {
                voxelCreators[mintableAssets[i].voxelHash] = creator;
            } else {
                require(
                    voxelCreators[mintableAssets[i].voxelHash] == creator,
                    "Voxel hash already used"
                );
            }
            catalystsToBurn[mintableAssets[i].tier] += mintableAssets[i].amount;

            assets[i] = IAsset.AssetData(
                creator,
                mintableAssets[i].amount,
                mintableAssets[i].tier,
                mintableAssets[i].creatorNonce,
                !(mintableAssets[i].tier > 1),
                0
            );
        }

        // burn the catalysts of each tier
        for (uint256 i = 0; i < catalystsToBurn.length; ) {
            if (catalystsToBurn[i] > 0) {
                ICatalyst(catalystContract).burnFrom(
                    creator,
                    i,
                    catalystsToBurn[i]
                );
            }
        }
        IAsset(assetContract).mintBatch(assets);
    }

    /// @notice Special mint function for TSB exculsive assets
    /// @dev TSB exclusive items cannot be recycled
    /// @dev TSB exclusive items are revealed by default
    /// @dev TSB exclusive items do not require catalysts to mint
    /// @dev Only the special minter role can call this function
    /// @dev Admin should be able to mint more copies of the same asset
    /// @param creator The address to use as the creator of the asset
    /// @param recipient The recipient of the asset
    /// @param amount The amount of assets to mint
    function mintExclusive(
        address creator,
        address recipient,
        uint256 amount
    ) external onlyRole(EXCLUSIVE_MINTER_ROLE) {
        require(amount > 0, "Amount must be > 0");
        IAsset.AssetData memory asset = IAsset.AssetData(
            creator,
            amount,
            0,
            0,
            true,
            0
        );
        IAsset(assetContract).mintSpecial(recipient, asset);
    }

    /// @notice Reveal an asset to view its abilities and enhancements
    /// @dev the reveal mechanism works through burning the asset and minting a new one with updated tokenId
    /// @param tokenId the tokenId of the asset to reveal
    /// @param amount the amount of tokens to reveal
    function revealBurn(uint256 tokenId, uint256 amount) external {
        // amount should be greater than 0
        require(amount > 0, "Amount should be greater than 0");
        // make sure the token is not already revealed
        IAsset.AssetData memory data = IAsset(assetContract).getDataFromTokenId(
            tokenId
        );

        require(!data.revealed, "Token is already revealed");

        // burn the tokens
        IAsset(assetContract).burnFrom(_msgSender(), tokenId, amount);
        // generate the revealed token id
        emit AssetRevealBurn(
            _msgSender(),
            tokenId,
            data.creator,
            data.tier,
            data.creatorNonce,
            amount
        );
    }

    /// @notice Reveal assets to view their abilities and enhancements
    /// @dev Can be used to reveal multiple copies of the same token id
    /// @param signature Signature created on the TSB backend containing REVEAL_TYPEHASH and associated data, must be signed by authorized signer
    /// @param creator The original creator of the assets
    /// @param prevTokenId The tokenId of the unrevealed asset
    /// @param recipient The recipient of the revealed assets
    /// @param amount The amount of assets to reveal (must be equal to the length of revealHashes)
    /// @param revealHashes The hashes of the revealed attributes and enhancements
    function revealMint(
        bytes memory signature,
        address creator,
        uint256 prevTokenId,
        address recipient,
        uint256 amount,
        uint40[] calldata revealHashes
    ) external {
        // verify the signature
        require(
            _verify(
                signature,
                _hashReveal(creator, prevTokenId, amount, revealHashes)
            ),
            "Invalid signature"
        );
        // the amount must be the same as the length of the reveal hashes
        require(amount == revealHashes.length, "Invalid amount");

        // mint the tokens
        uint256[] memory newIds = IAsset(assetContract).revealMint(
            recipient,
            amount,
            prevTokenId,
            revealHashes
        );

        emit AssetsRevealed(recipient, creator, prevTokenId, newIds);
    }

    /// @notice Recycles a batch of assets, to retireve catalyst at a defined ratio, the catalysts are minted to the caller of the function
    /// @dev The amount of copies that need to be burned in order to get the catalysts is defined in the asset contract
    /// @dev All tokensIds must be owned by the caller of the function
    /// @dev All tokenIds must be of the same tier
    /// @dev The sum of amounts must return zero from the modulo operation, for example if the amount of copies needed to retrieve a catalyst is 3, the sum of amounts must be a multiple of 3
    /// @param tokenIds The token ids of the assets to recycle
    /// @param amounts The amount of assets to recycle
    /// @param catalystTier The tier of the catalysts to mint
    function recycleAssets(
        uint256[] calldata tokenIds,
        uint256[] calldata amounts,
        uint256 catalystTier
    ) external {
        require(catalystTier > 0, "Catalyst tier must be > 0");
        uint256 amountOfCatalystExtracted = IAsset(assetContract).recycleBurn(
            _msgSender(),
            tokenIds,
            amounts,
            catalystTier
        );
        // mint the catalysts
        ICatalyst(catalystContract).mint(
            _msgSender(),
            catalystTier,
            amountOfCatalystExtracted,
            ""
        );
    }

    /// @notice Set the address of the catalyst contract
    /// @dev Only the admin role can set the catalyst contract
    /// @dev The catalysts are used in the minting process
    /// @param _catalystContract The address of the catalyst contract
    function changeCatalystContractAddress(
        address _catalystContract
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        catalystContract = _catalystContract;
        emit CatalystContractAddressChanged(_catalystContract);
    }

    /// @notice Set the address of the asset contract
    /// @dev Only the admin role can set the asset contract
    /// @param _catalystContract The address of the asset contract
    function changeAssetContractAddress(
        address _catalystContract
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        assetContract = _catalystContract;
        emit AssetContractAddressChanged(_catalystContract);
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function _msgSender()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771Handler)
        returns (address sender)
    {
        return ERC2771Handler._msgSender();
    }

    function _msgData()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771Handler)
        returns (bytes calldata)
    {
        return ERC2771Handler._msgData();
    }

    /// @notice Takes the signature and the digest and returns if the signer has a backend signer role assigned
    /// @dev Multipurpose function that can be used to verify signatures with different digests
    /// @param signature Signature hash
    /// @param digest Digest hash
    /// @return bool
    function _verify(
        bytes memory signature,
        bytes32 digest
    ) internal view returns (bool) {
        address recoveredSigner = ECDSAUpgradeable.recover(digest, signature);
        return hasRole(BACKEND_SIGNER_ROLE, recoveredSigner);
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
        uint40[] calldata revealHashes
    ) internal view returns (bytes32 digest) {
        digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    REVEAL_TYPEHASH,
                    creator,
                    prevTokenId,
                    amount,
                    revealHashes
                )
            )
        );
    }

    /// @notice Creates a hash of the mint data
    /// @param asset The asset to mint
    /// @return digest The hash of the mint data
    function _hashMint(
        MintableAsset memory asset
    ) internal view returns (bytes32 digest) {
        digest = _hashTypedDataV4(keccak256(abi.encode(MINT_TYPEHASH, asset)));
    }

    /// @notice Creates a hash of the mint batch data
    /// @param assets The assets to mint
    /// @return digest The hash of the mint batch data
    function _hashMintBatch(
        MintableAsset[] memory assets
    ) internal view returns (bytes32 digest) {
        digest = _hashTypedDataV4(
            keccak256(abi.encode(MINT_BATCH_TYPEHASH, assets))
        );
    }
}
