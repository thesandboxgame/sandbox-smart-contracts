pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "../contracts_common/src/Libraries/SafeMathWithRequire.sol";
import "../contracts_common/src/Interfaces/ERC20.sol";
import "../contracts_common/src/BaseWithStorage/MetaTransactionReceiver.sol";
import "../contracts_common/src/Interfaces/Medianizer.sol";
import "../contracts_common/src/BaseWithStorage/Admin.sol";
import "../Catalyst/ERC20GroupCatalyst.sol";
import "../Catalyst/ERC20GroupGem.sol";
import "./PurchaseValidator.sol";


/**
 * @title StarterPack contract that supports SAND, DAI and ETH as payment
 * @notice This contract manages the distribution of StarterPacks for Catalysts and Gems
 */
contract StarterPackV1 is Admin, MetaTransactionReceiver, PurchaseValidator {
    using SafeMathWithRequire for uint256;
    uint256 internal constant daiPrice = 14400000000000000;

    ERC20 internal _sand;
    Medianizer private _medianizer;
    ERC20 private _dai;
    ERC20Group internal _erc20GroupCatalyst;
    ERC20Group internal _erc20GroupGem;

    bool _sandEnabled;
    bool _etherEnabled;
    bool _daiEnabled;

    address payable internal _wallet;

    event Purchase(address indexed from, Message, uint256 priceInSand);

    event SetPrices(uint256[4] prices);

    struct Message {
        uint256[] catalystIds;
        uint256[] catalystQuantities;
        uint256[] gemIds;
        uint256[] gemQuantities;
        address buyer;
        uint256 nonce;
    }

    // ////////////////////////// Functions ////////////////////////

    constructor(
        address starterPackAdmin,
        address sandContractAddress,
        address initialMetaTx,
        address payable initialWalletAddress,
        address medianizerContractAddress,
        address daiTokenContractAddress,
        address erc20GroupCatalystAddress,
        address erc20GroupGemAddress,
        address initialSigningWallet
    ) public PurchaseValidator(initialSigningWallet) {
        _setMetaTransactionProcessor(initialMetaTx, true);
        _wallet = initialWalletAddress;
        _admin = starterPackAdmin;
        _sand = ERC20(sandContractAddress);
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
        Message calldata message,
        bytes calldata signature
    ) external {
        require(_sandEnabled, "sand payments not enabled");

        require(message.buyer != address(0), "DESTINATION_ZERO_ADDRESS");
        require(message.buyer != address(this), "DESTINATION_STARTERPACKV1_CONTRACT");
        require(isPurchaseValid(from, message.catalystIds, message.catalystQuantities, message.gemIds, message.gemQuantities, message.buyer, message.nonce, signature), "INVALID_PURCHASE");

        uint256 amountInSand = _calculateTotalPriceInSand();
        _handlePurchaseWithERC20(message.buyer, _wallet, address(_sand), amountInSand);
        _erc20GroupCatalyst.batchTransferFrom(address(this), message.buyer, message.catalystIds, message.catalystQuantities);
        _erc20GroupGem.batchTransferFrom(address(this), message.buyer, message.gemIds, message.gemQuantities);
        emit Purchase(from, message, amountInSand);
    }

    // function purchaseWithEth(
    //     address from,
    //     address to,
    //     uint256[] calldata catalystIds,
    //     uint256[] calldata catalystQuantities,
    //     uint256[] calldata gemIds,
    //     uint256[] calldata gemQuantities,
    //     uint256 nonce,
    //     bytes calldata signature
    // ) external payable {
    //     // TODO:
    //     uint256 priceInSand = 0;

    //     emit Purchase(from, to, catalystIds, catalystQuantities, gemIds, gemQuantities, priceInSand);
    // }

    // function purchaseWithDai(
    //     address from,
    //     address to,
    //     uint256[] calldata catalystIds,
    //     uint256[] calldata catalystQuantities,
    //     uint256[] calldata gemIds,
    //     uint256[] calldata gemQuantities,
    //     uint256 nonce,
    //     bytes calldata signature
    // ) external payable {n
    //     // TODO:
    //     uint256 priceInSand = 0;

    //     emit Purchase(from, to, catalystIds, catalystQuantities, gemIds, gemQuantities, priceInSand);
    // }

    function withdrawAll(address to) external {
        require(msg.sender == _admin, "only admin can withdraw remaining tokens");
        // TODO: withdrawal
    }

    // Prices can be changed anytime by admin. Envisage the need to set a delay where old prices are allowed
    function setPrices(uint256[4] calldata prices) external {
        require(msg.sender == _admin, "only admin can change StarterPack prices");
        // TODO: prices
        // emit SetPrices(prices);
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

    function _calculateTotalPriceInSand() internal returns (uint256) {
        // TODO:
        return 1;
    }

    function _handlePurchaseWithERC20(
        address buyer,
        address payable paymentRecipient,
        address tokenAddress,
        uint256 amount
    ) internal {
        ERC20 token = ERC20(tokenAddress);
        uint256 amountForDestination = amount;
        require(token.transferFrom(buyer, paymentRecipient, amountForDestination), "PAYMENT_TRANSFER_FAILED");
    }
}
