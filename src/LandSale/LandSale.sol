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

    function buyLandWithEther(
        address to,
        uint16 size,
        uint16 x,
        uint16 y,
        uint256 landId,
        bytes32 landHash,
        uint256 price
    ) external payable whenNotPaused() {
        require(msg.value == price, "Insufficient funds");

        land.mintBlock(to, size, x, y);
    }

    function buyLandWithSand(
        address to,
        uint16 size,
        uint16 x,
        uint16 y,
        uint256 landId,
        bytes32 landHash,
        uint256 price
    ) external whenNotPaused() {
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
