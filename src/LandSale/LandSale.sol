pragma solidity 0.5.9;

import "../Land.sol";
import "../../contracts_common/src/Interfaces/ERC20.sol";
import "../../contracts_common/src/BaseWithStorage/MetaTransactionReceiver.sol";

/**
 * @title Land Sale contract
 * @notice This contract mananges the sale of our lands
 */
contract LandSale is MetaTransactionReceiver {
    Land public _land;
    ERC20 public _erc20;

    address public _admin;
    address payable public _wallet;
    bool public _isPaused = false;

    bytes32 _merkleRoot;

    /**
     * @notice Initializes the contract
     * @param landAddress The address of the land contract
     * @param erc20ContractAddress The address of the erc20 token for payment
     * @param initialMetaTx initial mettx processor
     * @param admin The address of the admin
     * @param initialWalletAddress The address of the recipient wallet
     */
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

    function buyLand(
        address buyer,
        address to,
        uint16 x,
        uint16 y,
        uint16 size,
        uint256 price,
        bytes32[] calldata proof
    ) external payable whenNotPaused() {
        require(buyer == msg.sender || _metaTransactionContracts[msg.sender], "not authorized");
        bytes32 landHash = _generateLandHash(x, y, size, price);
        bytes32 leaf = keccak256(abi.encodePacked(landHash));

        require(
            _verify(proof, leaf),
            "Invalid land provided"
        );

        require(
            _erc20.transferFrom(
                msg.sender,
                _wallet,
                price
            ),
            "erc20 transfer failed"
        );

        _land.mintBlock(to, size, x, y);
    }

    /**
     * @notice Changes the address of the admin
     * @param newAdmin The address of the new admin
     */
    function changeAdmin(address newAdmin) external onlyAdmin() {
        _admin = newAdmin;
    }

    /**
     * @notice Toggles the current pause state
     */
    function togglePause() external onlyAdmin() {
        _isPaused = !_isPaused;
    }

    /**
     * @notice Generates the hash of a land (different from the id)
     * @param x The x position of the land
     * @param y The y position of the land
     * @param size The size of the land
     * @param price The price of the land
     * @return The hash of the land
     */
    function _generateLandHash(
        uint16 x,
        uint16 y,
        uint16 size,
        uint256 price
    ) private pure returns (
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

    /**
     * @notice Verifies if a leaf is part of a Merkle tree
     * @param proof The proof for the leaf
     * @param leaf The leaf to verify
     * @return True if the leaf is valid
     */
    function _verify(bytes32[] memory proof, bytes32 leaf) private view returns (bool) {
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

    modifier onlyAdmin() {
        require(msg.sender == _admin, "Sender is not the admin");
        _;
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
