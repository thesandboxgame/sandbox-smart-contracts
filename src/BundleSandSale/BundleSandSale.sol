pragma solidity 0.5.9;

import "../../contracts_common/src/Libraries/SafeMathWithRequire.sol";
import "../../contracts_common/src/Interfaces/ERC20.sol";
import "../../contracts_common/src/Interfaces/Medianizer.sol";
import "../Asset/ERC1155ERC721.sol";

contract BundleSandSale {
    using SafeMathWithRequire for uint256;
    Medianizer public medianizer;
    ERC20 public sand;
    ERC20 public dai;
    ERC1155ERC721 _asset;

    address public admin;
    address payable public wallet;
    bool public isPaused;
    uint256[] _packIds;
    uint256[] _packAmounts;
    uint256 _packSand;
    uint256 _sandPriceInUsd;

    /**
     * @notice Initializes the contract
     * @param medianizerContractAddress The address of the Medianizer contract
     * @param sandTokenContractAddress The address of the SAND token contract
     * @param daiTokenContractAddress The address of the DAI token contract
     * @param initialAdmin The address of the admin of the contract
     * @param initialWallet the address of the wallet that will receive the funds
     */
    constructor(
        address sandTokenContractAddress,
        address assetTokenContractAddress,
        address medianizerContractAddress,
        address daiTokenContractAddress,
        address initialAdmin,
        address payable initialWallet,
        uint256[] memory packIds,
        uint256[] memory packAmounts,
        uint256 packSand,
        uint256 sandPriceInUsd
    ) public {
        require(initialWallet != address(0), "need a wallet to receive funds");
        medianizer = Medianizer(medianizerContractAddress);
        sand = ERC20(sandTokenContractAddress);
        _asset = ERC1155ERC721(assetTokenContractAddress);
        dai = ERC20(daiTokenContractAddress);
        admin = initialAdmin;
        wallet = initialWallet;
        _packIds = packIds;
        _packIds = packAmounts;
        _packSand = packSand;
        _sandPriceInUsd = sandPriceInUsd;
    }

    /**
     * @notice Buys Sand Bundle with Ether
     * @param to The address that will receive the SAND
     */
    function buyBundleWithEther(address to) external payable whenNotPaused() {
        // require(
        //     sand.transferFrom(address(this), to, sandAmount),
        //     "Transfer failed"
        // );

        // address(wallet).transfer(msg.value);
    }

    /**
     * @notice Buys Sand Bundle with DAI
     * @param daiAmount The amount of DAI
     * @param to The address that will receive the SAND
     */
    function buyBundleWithDai(uint256 daiAmount, address to) external whenNotPaused() {
        // require(
        //     dai.transferFrom(msg.sender, wallet, daiAmount),
        //     "Transfer failed"
        // );

        // require(
        //     sand.transferFrom(address(this), to, sandAmount),
        //     "Transfer failed"
        // );
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
     * @notice Transfers Assets from this contract to another address
     * @param to The address that will receive the funds
     * @param ids ids of the Asset to transfer
     * @param amounts The amounts to transfer
     */
    function withdrawAssets(address to, uint256[] calldata ids, uint256[] calldata amounts) external onlyAdmin() {
        _asset.safeBatchTransferFrom(address(this), to, ids, amounts, "");
    }

    /**
     * @notice Returns the amount of USD for a specific amount of ETH
     * @param ethAmount An amount of ETH
     * @return The amount of USD
     */
    function getUSDAmountWithEther(uint256 ethAmount) public view returns (uint256) {
        uint256 ethUsdPair = getEthUsdPair();
        return ethAmount.mul(ethUsdPair);
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
