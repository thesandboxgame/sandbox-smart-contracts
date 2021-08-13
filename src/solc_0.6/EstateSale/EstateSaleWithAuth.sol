/* solhint-disable not-rely-on-time, func-order */
pragma solidity 0.6.5;

import "../common/Libraries/SafeMathWithRequire.sol";
import "./LandToken.sol";
import "../common/Interfaces/ERC1155.sol";
import "../common/Interfaces/ERC20.sol";
import "../common/BaseWithStorage/MetaTransactionReceiver.sol";
import "../ReferralValidator/ReferralValidator.sol";
import "./AuthValidator.sol";

/// @title Estate Sale contract with referral
/// @notice This contract manages the sale of our lands as Estates
contract EstateSaleWithFee is MetaTransactionReceiver, ReferralValidator {
    using SafeMathWithRequire for uint256;

    event LandQuadPurchased(
        address indexed buyer,
        address indexed to,
        uint256 indexed topCornerId,
        uint256 size,
        uint256 price,
        address token,
        uint256 amountPaid
    );

    /// @notice set the wallet receiving the proceeds
    /// @param newWallet address of the new receiving wallet
    function setReceivingWallet(address payable newWallet) external {
        require(newWallet != address(0), "ZERO_ADDRESS");
        require(msg.sender == _admin, "NOT_AUTHORIZED");
        _wallet = newWallet;
    }

    function rebalanceSand(uint256 newMultiplier) external {
        require(msg.sender == _admin, "NOT_AUTHORIZED");
        _multiplier = newMultiplier;
    }

    function getSandMultiplier() external view returns (uint256) {
        return _multiplier;
    }

    /// @notice buy Land with SAND using the merkle proof associated with it
    /// @param addresses [0] address that perform the payment [1] address that will own the purchased Land [2] the reserved address (if any)
    /// @param x x coordinate of the Land
    /// @param y y coordinate of the Land
    /// @param size size of the pack of Land to purchase
    /// @param priceInSand price in SAND to purchase that Land
    /// @param proof merkleProof for that particular Land
    function buyLandWithSand(
        /// TODO: review any other workaround for stack too deep
        address[] calldata addresses,
        uint256 x,
        uint256 y,
        uint256 size,
        uint256 priceInSand,
        bytes32 salt,
        uint256[] calldata assetIds,
        bytes32[] calldata proof,
        bytes calldata referral,
        bytes calldata signature
    ) external {
        _checkPrices(priceInSand, priceInSand);
        _checkValidity2(addresses);
        _checkValidity(addresses, x, y, size, priceInSand, salt, assetIds, proof, signature);
        _handleFeeAndReferral(addresses[0], priceInSand, referral);
        _mint(addresses, x, y, size, priceInSand, priceInSand);
        _sendAssets(addresses[1], assetIds);
    }

    /// @notice Gets the expiry time for the current sale
    /// @return The expiry time, as a unix epoch
    function getExpiryTime() external view returns (uint256) {
        return _expiryTime;
    }

    /// @notice Gets the Merkle root associated with the current sale
    /// @return The Merkle root, as a bytes32 hash
    function getMerkleRoot() external view returns (bytes32) {
        return _merkleRoot;
    }

    /// @notice enable Admin to withdraw remaining assets from EstateSaleWithFee contract
    /// @param to intended recipient of the asset tokens
    /// @param assetIds the assetIds to be transferred
    /// @param values the quantities of the assetIds to be transferred
    function withdrawAssets(
        address to,
        uint256[] calldata assetIds,
        uint256[] calldata values
    ) external {
        require(msg.sender == _admin, "NOT_AUTHORIZED");
        // require(block.timestamp > _expiryTime, "SALE_NOT_OVER"); // removed to recover in case of misconfigured sales
        _asset.safeBatchTransferFrom(address(this), to, assetIds, values, "");
    }

    function onERC1155Received(
        address, /*operator*/
        address, /*from*/
        uint256, /*id*/
        uint256, /*value*/
        bytes calldata /*data*/
    ) external pure returns (bytes4) {
        return 0xf23a6e61;
    }

    function onERC1155BatchReceived(
        address, /*operator*/
        address, /*from*/
        uint256[] calldata, /*ids*/
        uint256[] calldata, /*values*/
        bytes calldata /*data*/
    ) external pure returns (bytes4) {
        return 0xbc197c81;
    }

    function _sendAssets(address to, uint256[] memory assetIds) internal {
        uint256[] memory values = new uint256[](assetIds.length);
        for (uint256 i = 0; i < assetIds.length; i++) {
            values[i] = 1;
        }
        _asset.safeBatchTransferFrom(address(this), to, assetIds, values, "");
    }

    function _checkPrices(uint256 priceInSand, uint256 adjustedPriceInSand) internal view {
        require(adjustedPriceInSand == priceInSand.mul(_multiplier).div(MULTIPLIER_DECIMALS), "INVALID_PRICE");
    }

    function _checkValidity2(address[] memory addresses) internal view {
        require(addresses.length == 3, "INVALID_ADDRESSES");
        /* solium-disable-next-line security/no-block-members */
        require(block.timestamp < _expiryTime, "SALE_IS_OVER");
        require(addresses[0] == msg.sender || _metaTransactionContracts[msg.sender], "NOT_AUTHORIZED");
        require(addresses[2] == address(0) || addresses[2] == addresses[0], "RESERVED_LAND");
    }

    function _checkValidity(
        address[] memory addresses,
        uint256 x,
        uint256 y,
        uint256 size,
        uint256 price,
        bytes32 salt,
        uint256[] memory assetIds,
        bytes32[] memory proof,
        bytes memory signature
    ) internal view {
        bytes32 hashedData = keccak256(abi.encodePacked(addresses[1], addresses[2], x, y, size, price, salt, assetIds));
        require(_authValidator.isAuthValid(signature, hashedData), "INVALID_AUTH");

        bytes32 leaf = _generateLandHash(x, y, size, price, addresses[2], salt, assetIds);
        require(_verify(proof, leaf), "INVALID_LAND");
    }

    function _mint(
        address[] memory addresses,
        uint256 x,
        uint256 y,
        uint256 size,
        uint256 price,
        uint256 tokenAmount
    ) internal {
        if (size == 1 || _estate == address(0)) {
            _land.mintQuad(addresses[1], size, x, y, "");
        } else {
            _land.mintQuad(_estate, size, x, y, abi.encode(addresses[1]));
        }
        emit LandQuadPurchased(
            addresses[0],
            addresses[1],
            x + (y * GRID_SIZE),
            size,
            price,
            address(_sand),
            tokenAmount
        );
    }

    function _generateLandHash(
        uint256 x,
        uint256 y,
        uint256 size,
        uint256 price,
        address reserved,
        bytes32 salt,
        uint256[] memory assetIds
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(x, y, size, price, reserved, salt, assetIds));
    }

    function _verify(bytes32[] memory proof, bytes32 leaf) internal view returns (bool) {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];

            if (computedHash < proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        return computedHash == _merkleRoot;
    }

    function _handleFeeAndReferral(
        address buyer,
        uint256 priceInSand,
        bytes memory referral
    ) internal {
        // send 5% fee to a specially configured instance of FeeDistributor.sol
        uint256 remainingAmountInSand = _handleSandFee(buyer, priceInSand);

        // calculate referral based on 95% of original priceInSand
        handleReferralWithERC20(buyer, remainingAmountInSand, referral, _wallet, address(_sand));
    }

    function _handleSandFee(address buyer, uint256 priceInSand) internal returns (uint256) {
        uint256 feeAmountInSand = priceInSand.mul(FEE).div(100);
        require(_sand.transferFrom(buyer, address(_feeDistributor), feeAmountInSand), "FEE_TRANSFER_FAILED");
        return priceInSand.sub(feeAmountInSand);
    }

    uint256 internal constant GRID_SIZE = 408; // 408 is the size of the Land

    ERC1155 internal immutable _asset;
    LandToken internal immutable _land;
    ERC20 internal immutable _sand;
    address internal immutable _estate;
    address internal immutable _feeDistributor;

    address payable internal _wallet;
    AuthValidator internal _authValidator;
    uint256 internal immutable _expiryTime;
    bytes32 internal immutable _merkleRoot;

    uint256 private constant FEE = 5; // percentage of land sale price to be diverted to a specially configured instance of FeeDistributor, shown as an integer

    uint256 private _multiplier = 1000; // multiplier used for rebalancing SAND values, 3 decimal places
    uint256 private constant MULTIPLIER_DECIMALS = 1000;

    constructor(
        address landAddress,
        address sandContractAddress,
        address initialMetaTx,
        address admin,
        address payable initialWalletAddress,
        bytes32 merkleRoot,
        uint256 expiryTime,
        address initialSigningWallet,
        uint256 initialMaxCommissionRate,
        address estate,
        address asset,
        address feeDistributor,
        address authValidator
    ) public ReferralValidator(initialSigningWallet, initialMaxCommissionRate) {
        _land = LandToken(landAddress);
        _sand = ERC20(sandContractAddress);
        _setMetaTransactionProcessor(initialMetaTx, true);
        _wallet = initialWalletAddress;
        _merkleRoot = merkleRoot;
        _expiryTime = expiryTime;
        _admin = admin;
        _estate = estate;
        _asset = ERC1155(asset);
        _feeDistributor = feeDistributor;
        _authValidator = AuthValidator(authValidator);
    }
}
