pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./contracts_common/src/Libraries/SafeMathWithRequire.sol";
import "./contracts_common/src/Interfaces/ERC20.sol";
import "./contracts_common/src/BaseWithStorage/MetaTransactionReceiver.sol";
import "./contracts_common/src/Interfaces/Medianizer.sol";
import "./contracts_common/src/BaseWithStorage/Admin.sol";
import "./Catalyst/ERC20GroupCatalyst.sol";
import "./Catalyst/ERC20GroupGem.sol";


/**
 * @title StarterPack contract that supports SAND, DAI and ETH as payment
 * @notice This contract manages the distribution of StarterPacks for Catalysts and Gems
 */
contract StarterPackV1 is Admin, MetaTransactionReceiver {
    using SafeMathWithRequire for uint256;

    uint256 internal constant daiPrice = 14400000000000000;

    ERC20 internal _sand;
    Medianizer private _medianizer;
    ERC20 private _dai;

    ERC20Group internal _erc20GroupCatalyst;
    ERC20Group internal _erc20GroupGem;

    bool _sandEnabled = false;
    bool _etherEnabled = true;
    bool _daiEnabled = false;

    address payable internal _wallet;
    bool _purchasesEnabled = false;

    mapping(address => mapping(uint256 => uint256)) public nonceByCreator;

    event Purchase(address indexed from, address indexed to, uint256[4] catQuantities, uint256[5] gemQuantities, uint256 priceInSand);

    event SetPrices(uint256[4] prices);

    // ////////////////////////// Functions ////////////////////////

    constructor(
        address starterPackAdmin,
        address sandContractAddress,
        address initialMetaTx,
        address payable initialWalletAddress,
        address medianizerContractAddress,
        address daiTokenContractAddress,
        address erc20GroupCatalystAddress,
        address erc20GroupGemAddress
    ) public {
        _admin = starterPackAdmin;
        _sand = ERC20(sandContractAddress);
        _setMetaTransactionProcessor(initialMetaTx, true);
        _wallet = initialWalletAddress;
        _medianizer = Medianizer(medianizerContractAddress);
        _dai = ERC20(daiTokenContractAddress);
        _erc20GroupCatalyst = ERC20Group(erc20GroupCatalystAddress);
        _erc20GroupGem = ERC20Group(erc20GroupGemAddress);
    }

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
    ) external payable {
        require(_purchasesEnabled, "sale not started");
        require(_sandEnabled, "sand payments not enabled");

        require(to != address(0), "DESTINATION_ZERO_ADDRESS");
        require(to != address(this), "DESTINATION_STARTERPACKV1_CONTRACT");

        require(_isAuthorized(from, to, nonce, signature), "NOT_AUTHORIZED");
        require(_isValidNonce(to, nonce), "INVALID_NONCE");

        uint256 priceInSand = _calculateTotalPriceInSand();

        _handlePurchaseWithERC20(from, priceInSand, _wallet, address(_sand));

        // _issueCatalysts();

        // _issueGems();

        emit Purchase(from, to, catalystQuantities, gemQuantities, priceInSand);
    }

    function purchaseWithEth(
        address from,
        address to,
        uint256[4] calldata catalystQuantities,
        uint256[5] calldata gemQuantities,
        uint256 nonce,
        bytes calldata signature
    ) external payable {
        // TODO:
        uint256 priceInSand = 0;

        emit Purchase(from, to, catalystQuantities, gemQuantities, priceInSand);
    }

    function purchaseWithDai(
        address from,
        address to,
        uint256[4] calldata catalystQuantities,
        uint256[5] calldata gemQuantities,
        uint256 nonce,
        bytes calldata signature
    ) external payable {
        // TODO:
        uint256 priceInSand = 0;

        emit Purchase(from, to, catalystQuantities, gemQuantities, priceInSand);
    }

    function withdrawAll(address to) external {
        require(!_purchasesEnabled, "sale is still in progress");
        require(msg.sender == _admin, "only admin can withdraw remaining tokens");
        // TODO: withdrawal
    }

    // Prices can be changed anytime by admin. Envisage the need to set a delay where old prices are allowed
    function setPrices(uint256[4] calldata prices) external {
        require(msg.sender == _admin, "only admin can change StarterPack prices");
        // TODO: prices
        emit SetPrices(prices);
    }

    function viewNonceByCreator(address to, uint256 nonce) external view returns (uint256) {
        return nonceByCreator[to][nonce];
    }

    function checkCatalystBalance(uint256 tokenId) external view returns (uint256) {
        return _erc20GroupCatalyst.balanceOf(address(this), tokenId);
    }

    function checkGemBalance(uint256 tokenId) external view returns (uint256) {
        return _erc20GroupGem.balanceOf(address(this), tokenId);
    }

    function checkCatalystBatchBalances(uint256[] calldata tokenIds) external view returns (uint256[] memory balances) {
        address[] memory owners;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            owners[i] = address(this);
        }
        return _erc20GroupCatalyst.balanceOfBatch(owners, tokenIds);
    }

    function checkGemBatchBalances(uint256[] calldata tokenIds) external view returns (uint256[] memory balances) {
        address[] memory owners;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            owners[i] = address(this);
        }
        return _erc20GroupGem.balanceOfBatch(owners, tokenIds);
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

    function _isAuthorized(
        address from,
        address to,
        uint256 nonce,
        bytes memory signature
    ) internal returns (bool) {
        // TODO: require(from == _admin || from == _meta || from == _creator, "not authorized"); // TBD
        // TODO: signature checks
        return true;
    }

    function _isValidNonce(address to, uint256 nonce) internal returns (bool) {
        require(nonceByCreator[to][nonce] + 1 == nonce, "nonce out of order"); // TODO:
        nonceByCreator[to][nonce] = nonce;
        return true;
    }

    function _calculateTotalPriceInSand() internal returns (uint256) {
        // TODO:
        return 10;
    }

    function _handlePurchaseWithERC20(
        address buyer,
        uint256 amount,
        address payable paymentRecipient,
        address tokenAddress
    ) internal {
        ERC20 token = ERC20(tokenAddress);
        uint256 amountForPaymentRecipient = amount;
        require(token.transferFrom(buyer, paymentRecipient, amountForPaymentRecipient), "payment transfer failed");
    }

    // function _issueCatalysts() internal returns (bool) {
    //     // TODO: transfer relevant Catalysts
    //     // call ERC20 single/batch transfer
    //     return true;
    // }

    // function _issueGems() internal returns (bool) {
    //     // TODO: transfer relevant Gems
    //      // call ERC20 single/batch transfer
    //     return true;
    // }
}
