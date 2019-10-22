pragma solidity 0.5.9;

import "../Land.sol";
import "../../contracts_common/src/Interfaces/ERC20.sol";


/**
 * @title Land Sale contract
 * @notice This contract mananges the sale of our lands
 */
contract LandSale {
    Land public land;
    ERC20 public sand;

    address public admin;
    address payable public wallet;
    bool public isPaused = false;

    /**
     * @notice Initializes the contract
     * @param landAddress The address of the land contract
     * @param sandAddress The address of the sand contract
     * @param initialAdminAddress The address of the admin
     * @param initialWalletAddress The address of the recipient wallet
     */
    constructor(
        address landAddress,
        address sandAddress,
        address initialAdminAddress,
        address payable initialWalletAddress
    ) public {
        land = Land(landAddress);
        sand = ERC20(sandAddress);
        admin = initialAdminAddress;
        wallet = initialWalletAddress;
    }

    function buyLand(
        address to,
        uint16 x,
        uint16 y,
        uint16 size,
        uint256 price,
        bytes32[] calldata proof,
        bytes32 root
    ) external payable whenNotPaused() {
        bytes32 landHash = generateLandHash(x, y, size, price);
        bytes32 leaf = keccak256(abi.encodePacked(landHash));

        require(
            verify(proof, root, leaf),
            "Invalid land provided"
        );

        require(
            sand.transferFrom(
                msg.sender,
                wallet,
                price
            ),
            "Insufficient funds"
        );

        land.mintBlock(to, size, x, y);
    }

    /**
     * @notice Changes the address of the admin
     * @param newAdmin The address of the new admin
     */
    function changeAdmin(address newAdmin) external onlyAdmin() {
        admin = newAdmin;
    }

    /**
     * @notice Toggles the current pause state
     */
    function togglePause() external onlyAdmin() {
        isPaused = !isPaused;
    }

    /**
     * @notice Generates the hash of a land (different from the id)
     * @param x The x position of the land
     * @param y The y position of the land
     * @param size The size of the land
     * @param price The price of the land
     * @return The hash of the land
     */
    function generateLandHash(
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
     * @param root The root of the Merkle tree
     * @param leaf The leaf to verify
     * @return True if the leaf is valid
     */
    function verify(bytes32[] memory proof, bytes32 root, bytes32 leaf) private pure returns (bool) {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];

            if (computedHash < proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        return computedHash == root;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Sender is not the admin");
        _;
    }

    modifier whenNotPaused() {
        require(isPaused == false, "Contract is paused");
        _;
    }

    modifier whenPaused() {
        require(isPaused == true, "Contract is not paused");
        _;
    }

}
