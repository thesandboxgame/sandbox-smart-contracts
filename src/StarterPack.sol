pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./contracts_common/src/Libraries/SafeMathWithRequire.sol";
import "./interfaces/IStarterPack.sol";
import "./contracts_common/src/Interfaces/ERC20.sol";
import "./contracts_common/src/BaseWithStorage/MetaTransactionReceiver.sol";
import "./contracts_common/src/Interfaces/Medianizer.sol";
import "./contracts_common/src/BaseWithStorage/Admin.sol";

/**
 * @title StarterPack contract that supports SAND, DAI and ETH as payment
 * @notice This contract manages the distribution of StarterPacks for Catalysts and Gems
 */
contract StarterPack is IStarterPack, Admin, MetaTransactionReceiver {
    using SafeMathWithRequire for uint256;

    uint256 internal constant daiPrice = 14400000000000000;

    ERC20 internal _sand;
    Medianizer private _medianizer;
    ERC20 private _dai;

    bool _sandEnabled = false;
    bool _etherEnabled = true;
    bool _daiEnabled = false;

    address payable internal _wallet;
    bool _purchasesEnabled = false;

    mapping(address => mapping(uint256 => bool)) public nonceByCreator;

    // ////////////////////////// Functions ////////////////////////

    constructor(
        address starterPackAdmin,
        address sandContractAddress,
        address initialMetaTx,
        address payable initialWalletAddress,
        address medianizerContractAddress,
        address daiTokenContractAddress
    ) public {
        _admin = starterPackAdmin;
        _sand = ERC20(sandContractAddress);
        _setMetaTransactionProcessor(initialMetaTx, true);
        _wallet = initialWalletAddress;
        _medianizer = Medianizer(medianizerContractAddress);
        _dai = ERC20(daiTokenContractAddress);
    }

    // TODO: as catalysts and gems are going to be sent to this contract we need to set up storage

    /// @dev set the wallet receiving the proceeds
    /// @param newWallet address of the new receiving wallet
    function setReceivingWallet(address payable newWallet) external {
        require(newWallet != address(0), "receiving wallet cannot be zero address");
        require(msg.sender == _admin, "only admin can change the receiving wallet");
        _wallet = newWallet;
    }

    /// @notice enable/disable the sale of StarterPacks
    /// @param enabled whether to enable or disable
    function setPurchasesEnabled(bool enabled) external {
        require(msg.sender == _admin, "only admin can start or stop the sale");
        _purchasesEnabled = enabled;
    }

    /// @notice start/stop the sale of StarterPacks
    /// @return whether purchase of StarterPacks is enabled or disabled
    function isPurchasingEnabled() external view returns (bool) {
        return _purchasesEnabled;
    }

    /// @dev enable/disable DAI payment for StarterPacks
    /// @param enabled whether to enable or disable
    function setDAIEnabled(bool enabled) external {
        require(msg.sender == _admin, "only admin can enable/disable DAI");
        _daiEnabled = enabled;
    }

    /// @notice return whether DAI payments are enabled
    /// @return whether DAI payments are enabled
    function isDAIEnabled() external view returns (bool) {
        return _daiEnabled;
    }

    /// @notice enable/disable ETH payment for StarterPacks
    /// @param enabled whether to enable or disable
    function setETHEnabled(bool enabled) external {
        require(msg.sender == _admin, "only admin can enable/disable ETH");
        _etherEnabled = enabled;
    }

    /// @notice return whether ETH payments are enabled
    /// @return whether ETH payments are enabled
    function isETHEnabled() external view returns (bool) {
        return _etherEnabled;
    }

    /// @dev enable/disable the specific SAND payment for StarterPacks
    /// @param enabled whether to enable or disable
    function setSANDEnabled(bool enabled) external {
        require(msg.sender == _admin, "only admin can enable/disable SAND");
        _sandEnabled = enabled;
    }

    /// @notice return whether the specific SAND payments are enabled
    /// @return whether the specific SAND payments are enabled
    function isSANDEnabled() external view returns (bool) {
        return _sandEnabled;
    }

    function purchaseWithSand(
        address from,
        address to,
        uint256[4] calldata catalystQuantities,
        uint256[5] calldata gemQuantities,
        uint256 nonce,
        bytes calldata signature
    ) external override payable {
        require(_purchasesEnabled, "sale not started");
        require(_sandEnabled, "sand payments not enabled");

         _isAuthorized(from, to, nonce, signature);

        _isValidNonce(to, nonce);

        uint256 priceInSand = _calculatePriceInSand();

        _handlePurchaseWithERC20(from, priceInSand, _wallet, address(_sand));

        _issueCatalysts();

        _issueGems();

        emit Purchase(from, to, catalystQuantities, gemQuantities);
    }

    function purchaseWithEth(
        address from,
        address to,
        uint256[4] calldata catalystQuantities,
        uint256[5] calldata gemQuantities,
        uint256 nonce,
        bytes calldata signature
    ) external override payable {
        
        // TODO:

        emit Purchase(from, to, catalystQuantities, gemQuantities);
    }

    function purchaseWithDai(
        address from,
        address to,
        uint256[4] calldata catalystQuantities,
        uint256[5] calldata gemQuantities,
        uint256 nonce,
        bytes calldata signature
    ) external override payable {

        // TODO:

        emit Purchase(from, to, catalystQuantities, gemQuantities);
    }

    // TBD: after admin sets purchasesEnabled as false (or sale has expired, could do this instead), admin can withdrawAll
    function withdrawAll(address to) external override {
        require(!_purchasesEnabled, "sale is still in progress");
        require(msg.sender == _admin, "only admin can withdraw remaining tokens");
        emit Withdraw(to, 42); // TODO: what Catalyst & Gem information do we want to see?
    }

    // TBD: timing for setPrices. Enable admin to update prices at any time, or ensure that purchasing is disabled first?
    function setPrices(uint256[4] calldata prices) external override {
        require(msg.sender == _admin, "only admin can change StarterPack prices");
        emit SetPrices(prices);
    }

    // ////////////////////////// Internal ////////////////////////

    /**
     * @notice Returns the amount of ETH for a specific amount of SAND
     * @param sandAmount An amount of SAND
     * @return The amount of ETH
     */
    function _getEtherAmountWithSAND(uint256 sandAmount) internal view returns (uint256) {
        uint256 ethUsdPair = _getEthUsdPair();
        return sandAmount.mul(daiPrice).div(ethUsdPair);
    }

     /**
     * @notice Gets the ETHUSD pair from the Medianizer contract
     * @return The pair as an uint256
     */
    function _getEthUsdPair() internal view returns (uint256) {
        bytes32 pair = _medianizer.read();
        return uint256(pair);
    }
        
    function _isAuthorized(address from, address to, uint256 nonce, bytes memory signature) internal returns (bool) {
        // TODO: require(from == _admin || from == _meta || from == _creator, "not authorized"); // TBD
        // TODO: signature checks
        return true;
    }

    function _isValidNonce(address to, uint256 nonce) internal returns (bool) {
        require(!nonceByCreator[to][nonce], "invalid nonce!");
        nonceByCreator[to][nonce] = true;
        return true;
    }
    
    function _calculatePriceInSand() internal returns (uint256) {
        // TODO:
        return 10;
    }
    
    function _handlePurchaseWithERC20(address buyer, uint256 amount, address payable paymentRecipient, address tokenAddress) internal {
        ERC20 token = ERC20(tokenAddress);
        uint256 amountForPaymentRecipient = amount;
        require(token.transferFrom(buyer, paymentRecipient, amountForPaymentRecipient), "payment transfer failed");
    }

    function _issueCatalysts() internal returns (bool) {
        // TODO: transfer relevant Catalysts
        return true;
    }
    
    function _issueGems() internal returns (bool) {
        // TODO: transfer relevant Gems
        return true;
    }

}
