/* solhint-disable not-rely-on-time, func-order */

// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "./AuthValidator.sol";
import "../common/Libraries/SafeMathWithRequire.sol";
import "../common/interfaces/ILandToken.sol";
import "../common/interfaces/IERC1155.sol";
import "../common/BaseWithStorage/WithReferralValidator.sol";
import "@openzeppelin/contracts-0.8/metatx/ERC2771Context.sol";

/// @title Estate Sale contract with referral
/// @notice This contract manages the sale of our lands as Estates
contract EstateSaleWithAuth is ERC2771Context, WithReferralValidator {
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

    uint256 internal constant GRID_SIZE = 408; // 408 is the size of the Land

    IERC1155 internal immutable _asset;
    ILandToken internal immutable _land;
    IERC20 internal immutable _sand;
    address internal immutable _estate;
    address internal immutable _feeDistributor;

    address payable internal _wallet;
    AuthValidator internal _authValidator;
    uint256 internal immutable _expiryTime;
    bytes32 internal immutable _merkleRoot;

    uint256 private constant FEE = 5; // percentage of land sale price to be diverted to a specially configured instance of FeeDistributor, shown as an integer

    uint256 private constant X_INDEX = 0;
    uint256 private constant Y_INDEX = 1;
    uint256 private constant SIZE_INDEX = 2;
    uint256 private constant PRICE_INDEX = 3;

    // need to use struct to avoid "Stack Too Deep" error. Since there are too many parameters.
    struct Parameters {
        IERC1155 asset;
        ILandToken landAddress;
        IERC20 sandContractAddress;
        address admin;
        address estate;
        address feeDistributor;
        address payable initialWalletAddress;
        AuthValidator authValidator;
        uint256 expiryTime;
        bytes32 merkleRoot;
        address trustedForwarder;
        address initialSigningWallet;
        uint256 initialMaxCommissionRate;
    }

    constructor(Parameters memory p)
        ERC2771Context(p.trustedForwarder)
        WithReferralValidator(p.initialSigningWallet, p.initialMaxCommissionRate, p.admin)
    {
        _asset = p.asset;
        _land = p.landAddress;
        _sand = p.sandContractAddress;
        _admin = p.admin;
        _estate = p.estate;
        _feeDistributor = p.feeDistributor;
        _wallet = p.initialWalletAddress;
        _authValidator = p.authValidator;
        _expiryTime = p.expiryTime;
        _merkleRoot = p.merkleRoot;
    }

    /// @notice set the wallet receiving the proceeds
    /// @param newWallet address of the new receiving wallet
    function setReceivingWallet(address payable newWallet) external {
        require(newWallet != address(0), "ZERO_ADDRESS");
        require(msg.sender == _admin, "NOT_AUTHORIZED");
        _wallet = newWallet;
    }

    /// Note: Using struct to avoid the "Stack too deep" issue.
    /// @param buyer address that perform the payment
    /// @param to address that will own the purchased Land
    /// @param reserved the reserved address (if any)
    struct Addresses {
        address buyer;
        address to;
        address reserved;
    }
    /// @param addrs struct of addresses.
    /// @param info [X_INDEX=0] x coordinate of the Land [Y_INDEX=1] y coordinate of the Land [SIZE_INDEX=2] size of the pack of Land to purchase [PRICE_INDEX=3] price in SAND to purchase that Land
    /// @param proof merkleProof for that particular Land
    struct Arguments {
        uint256[] info;
        bytes32 salt;
        uint256[] assetIds;
        bytes32[] proof;
        bytes referral;
        bytes signature;
    }

    /// @notice buy Land with SAND using the merkle proof associated with it
    /// Note: Using structs to avoid "Stack too deep" error
    function buyLandWithSand(Addresses calldata addrs, Arguments calldata args) external {
        _checkAddressesAndExpiryTime(addrs.buyer, addrs.reserved);
        _checkAuthAndProofValidity(
            addrs.to,
            addrs.reserved,
            args.info,
            args.salt,
            args.assetIds,
            args.proof,
            args.signature
        );
        _handleFeeAndReferral(addrs.buyer, args.info[PRICE_INDEX], args.referral);
        _mint(addrs.buyer, addrs.to, args.info);
        _sendAssets(addrs.to, args.assetIds);
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

    // NOTE: _checkAddressesAndExpiryTime & _checkAuthAndProofValidity were split due to a stack too deep issue
    function _checkAddressesAndExpiryTime(address buyer, address reserved) internal view {
        /* solium-disable-next-line security/no-block-members */
        require(block.timestamp < _expiryTime, "SALE_IS_OVER");
        require(buyer == msg.sender || isTrustedForwarder(msg.sender), "NOT_AUTHORIZED");
        require(reserved == address(0) || reserved == buyer, "RESERVED_LAND");
    }

    // NOTE: _checkAddressesAndExpiryTime & _checkAuthAndProofValidity were split due to a stack too deep issue
    function _checkAuthAndProofValidity(
        address to,
        address reserved,
        uint256[] memory info,
        bytes32 salt,
        uint256[] memory assetIds,
        bytes32[] memory proof,
        bytes memory signature
    ) internal view {
        bytes32 hashedData =
            keccak256(
                abi.encodePacked(
                    to,
                    reserved,
                    info[X_INDEX],
                    info[Y_INDEX],
                    info[SIZE_INDEX],
                    info[PRICE_INDEX],
                    salt,
                    keccak256(abi.encodePacked(assetIds)),
                    keccak256(abi.encodePacked(proof))
                )
            );
        require(_authValidator.isAuthValid(signature, hashedData), "INVALID_AUTH");

        bytes32 leaf =
            _generateLandHash(
                info[X_INDEX],
                info[Y_INDEX],
                info[SIZE_INDEX],
                info[PRICE_INDEX],
                reserved,
                salt,
                assetIds
            );
        require(_verify(proof, leaf), "INVALID_LAND");
    }

    function _mint(
        address buyer,
        address to,
        uint256[] memory info
    ) internal {
        if (info[SIZE_INDEX] == 1 || _estate == address(0)) {
            _land.mintQuad(to, info[SIZE_INDEX], info[X_INDEX], info[Y_INDEX], "");
        } else {
            _land.mintQuad(_estate, info[SIZE_INDEX], info[X_INDEX], info[Y_INDEX], abi.encode(to));
        }

        emit LandQuadPurchased(
            buyer,
            to,
            info[X_INDEX] + (info[Y_INDEX] * GRID_SIZE),
            info[SIZE_INDEX],
            info[PRICE_INDEX],
            address(_sand),
            info[PRICE_INDEX]
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
        uint256 feeAmountInSand = (priceInSand * FEE) / 100;
        require(_sand.transferFrom(buyer, address(_feeDistributor), feeAmountInSand), "FEE_TRANSFER_FAILED");
        return priceInSand - feeAmountInSand;
    }
}
