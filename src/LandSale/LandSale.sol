pragma solidity 0.5.9;

import "../Land.sol";
import "../../contracts_common/src/Interfaces/ERC20.sol";
import "../../contracts_common/src/BaseWithStorage/MetaTransactionReceiver.sol";

/**
 * @title Land Sale contract
 * @notice This contract mananges the sale of our lands
 */
contract LandSale is MetaTransactionReceiver {
    Land internal _land;
    ERC20 internal _erc20;

    address payable internal _wallet;
    bool internal _isPaused = false;

    bytes32 internal _merkleRoot;

    constructor(
        address landAddress,
        address erc20ContractAddress,
        address initialMetaTx,
        address admin,
        address payable initialWalletAddress,
        bytes32 merkleRoot
    ) public {
        _land = Land(landAddress);
        _erc20 = ERC20(erc20ContractAddress);
        _setMetaTransactionProcessor(initialMetaTx, true);
        _admin = admin;
        _wallet = initialWalletAddress;
        _merkleRoot = merkleRoot;
    }

    function merkleRoot() external view returns(bytes32) {
        return _merkleRoot;
    }

    /**
     * @notice buy Land using the merkle proof associated with it
     * @param buyer address that perform the payment
     * @param to address that will owne the Land purchased
     * @param x x coordinate of the Land
     * @param y  coordinayte of the Land
     * @param size size of the pack of Land to purchase
     * @param price amount of Sand to purchase that Land
     * @param proof merkleProof for that particular Land
     * @return The address of the operator
     */
    function buyLand(
        address buyer,
        address to,
        uint16 x,
        uint16 y,
        uint16 size,
        uint256 price,
        bytes32[] calldata proof
    ) external whenNotPaused() {
        require(buyer == msg.sender || _metaTransactionContracts[msg.sender], "not authorized");
        bytes32 leaf = _generateLandHash(x, y, size, price);

        require(
            _verify(proof, leaf),
            "Invalid land provided"
        );

        require(
            _erc20.transferFrom(
                buyer,
                _wallet,
                price
            ),
            "erc20 transfer failed"
        );

        _land.mintBlock(to, size, x, y);
    }

    /**
     * @notice Toggles the current pause state
     */
    function togglePause() external onlyAdmin() {
        _isPaused = !_isPaused;
    }

    /**
     * @notice return whether the sale is paused
     * @return whether the sale is paused
     */
    function isPaused() external view returns(bool) {
        return _isPaused;
    }

    function _generateLandHash(
        uint16 x,
        uint16 y,
        uint16 size,
        uint256 price
    ) internal pure returns (
        bytes32
    ) {
        return keccak256(
            abi.encodePacked(
                x,
                y,
                size,
                price
            )
        );
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

    modifier whenNotPaused() {
        require(_isPaused == false, "Contract is paused");
        _;
    }

    modifier whenPaused() {
        require(_isPaused == true, "Contract is not paused");
        _;
    }

}
