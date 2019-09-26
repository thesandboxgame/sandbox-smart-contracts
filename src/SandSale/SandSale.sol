pragma solidity 0.5.9;

import "../../contracts_common/src/Libraries/SafeMathWithRequire.sol";
import "../../contracts_common/src/Interfaces/ERC20.sol";
import "../../contracts_common/src/Interfaces/Medianizer.sol";


/**
 * @title SAND tokens sale contract
 * @notice This contract is used to sell SAND tokens (accepts ETH and DAI) at a fixed USD price
 */
contract SandSale {
    using SafeMathWithRequire for uint256;
    Medianizer public medianizer;
    ERC20 public sand;
    ERC20 public dai;

    address public admin;
    address payable public wallet;
    bool public isPaused;

    /* We set the USD price here, 1 SAND = 0.007 USD */
    uint256 constant private sandPriceInUsd = 7000000000000000;

    /**
     * @notice Initializes the contract
     * @param medianizerContractAddress The address of the Medianizer contract
     * @param sandTokenContractAddress The address of the SAND token contract
     * @param daiTokenContractAddress The address of the DAI token contract
     * @param initialAdmin The address of the admin of the contract
     * @param initialWallet the address of the wallet that will receive the funds
     */
    constructor(
        address medianizerContractAddress,
        address sandTokenContractAddress,
        address daiTokenContractAddress,
        address initialAdmin,
        address payable initialWallet
    ) public {
        require(initialWallet != address(0), "need a wallet to receive funds");
        medianizer = Medianizer(medianizerContractAddress);
        sand = ERC20(sandTokenContractAddress);
        dai = ERC20(daiTokenContractAddress);
        admin = initialAdmin;
        wallet = initialWallet;
    }

    /**
     * @notice Buys SAND tokens with Ether
     * @param to The address that will receive the SAND
     */
    function buySandWithEther(address to) external payable whenNotPaused() {
        uint256 sandAmount = getSandAmountWithEther(msg.value);

        require(
            sand.transferFrom(address(this), to, sandAmount),
            "Transfer failed"
        );

        address(wallet).transfer(msg.value);
    }

    /**
     * @notice Buys SAND with DAI
     * @param daiAmount The amount of DAI
     * @param to The address that will receive the SAND
     */
    function buySandWithDai(uint256 daiAmount, address to) external whenNotPaused() {
        require(
            dai.transferFrom(msg.sender, wallet, daiAmount),
            "Transfer failed"
        );

        uint256 sandAmount = getSandAmountWithDai(daiAmount);

        require(
            sand.transferFrom(address(this), to, sandAmount),
            "Transfer failed"
        );
    }

    /**
     * @notice Transfers the SAND balance from this contract to another address
     * @param to The address that will receive the funds
     * @param amount The amount to transfer
     */
    function withdrawSand(address to, uint256 amount) external onlyAdmin() {
        require(
            sand.transferFrom(address(this), to, amount),
            "Transfer failed"
        );
    }

    /**
     * @notice Returns the amount of SAND that can be bought using a specific amount of ETH
     * @param ethAmount An amount of ETH
     * @return The amount of SAND
     */
    function getSandAmountWithEther(uint256 ethAmount) public view returns (uint256) {
        uint256 ethUsdPair = getEthUsdPair();

        uint256 usdAmount = ethAmount.mul(ethUsdPair);
        uint256 sandAmount = usdAmount.div(sandPriceInUsd);

        return sandAmount;
    }

    /**
     * @notice Returns the amount of SAND that can be bought using a specific amount of DAI
     * @param daiAmount An amount of DAI
     * @return The amount of SAND
     */
    function getSandAmountWithDai(uint256 daiAmount) public view returns (uint256) {
        uint256 sandAmount = daiAmount.div(sandPriceInUsd);
        return sandAmount;
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
     * @notice Gets the ETHUSD pair from the Medianizer contract
     * @return The pair as an uint256
     */
    function getEthUsdPair() private view returns (uint256) {
        bytes32 pair = medianizer.read();

        return uint256(pair);
    }

    modifier onlyAdmin() {
        require (msg.sender == admin, "only admin allowed");
        _;
    }

    modifier whenNotPaused() {
        require (isPaused == false, "Contract is paused");
        _;
    }

    modifier whenPaused() {
        require (isPaused == true, "Contract is not paused");
        _;
    }
}
