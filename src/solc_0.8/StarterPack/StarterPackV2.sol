//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {PurchaseValidator, Context, AccessControl} from "./PurchaseValidator.sol";
import {GemsCatalystsRegistry, ICatalyst, IGem, IERC20} from "../catalyst/GemsCatalystsRegistry.sol";
import {ERC2771HandlerV2} from "../common/BaseWithStorage/ERC2771/ERC2771HandlerV2.sol";

/// @title StarterPack contract for the purchase of StarterPacks (bundles of Catalysts and Gems) with EIP712
/// @notice This contract enables purchases with SAND when the backend authorizes it via message signing
/// @notice The following privileged roles are used in StarterPackV2: DEFAULT_ADMIN_ROLE, STARTERPACK_ROLE
/// @dev DEFAULT_ADMIN_ROLE is intended for contract setup / emergency, STARTERPACK_ROLE is provided for business purposes
contract StarterPackV2 is AccessControl, PurchaseValidator, ERC2771HandlerV2 {
    uint256 internal constant MAX_UINT16 = type(uint16).max;
    uint256 private constant DECIMAL_PLACES = 1 ether;
    uint256 private constant MAX_WITHDRAWAL = 100;
    // The delay between calling setPrices() and when the new prices come into effect
    // Minimizes the effect of price changes on pending TXs
    uint256 private constant PRICE_CHANGE_DELAY = 1 hours;

    // The timestamp of the last price change
    uint256 private _priceChangeTimestamp;

    // The following role is provided for business-related admin functions
    bytes32 public constant STARTERPACK_ROLE = keccak256("STARTERPACK_ROLE");

    address internal immutable _sand;
    address internal immutable _registry;
    address payable internal _wallet;
    bool public _sandEnabled;

    // Mapping catalyst and gem ids to their prices
    mapping(uint16 => uint256) private _catalystPrices;
    mapping(uint16 => uint256) private _catalystPreviousPrices;
    mapping(uint16 => uint256) private _gemPrices;
    mapping(uint16 => uint256) private _gemPreviousPrices;

    event ReceivingWallet(address indexed newReceivingWallet);
    event Purchase(address indexed buyer, Message message, uint256 amountPaid, address indexed token);
    event WithdrawAll(address indexed to, uint16[] catalystIds, uint16[] gemIds);
    event SandEnabled(bool enabled);
    event SetPrices(
        uint16[] catalystIds,
        uint256[] catalystPrices,
        uint16[] gemIds,
        uint256[] gemPrices,
        uint256 priceChangeTimestamp
    );

    struct Message {
        address buyer;
        uint16[] catalystIds;
        uint256[] catalystQuantities;
        uint16[] gemIds;
        uint256[] gemQuantities;
        uint256 nonce;
    }

    constructor(
        address defaultAdmin,
        address starterPackAdmin,
        address sandContractAddress,
        address trustedForwarder,
        address payable initialWalletAddress,
        address initialSigningWallet,
        address registry
    ) PurchaseValidator(initialSigningWallet, "Sandbox StarterPack", "1.0") ERC2771HandlerV2(trustedForwarder) {
        require(defaultAdmin != address(0), "ADMIN_ZERO_ADDRESS");
        require(starterPackAdmin != address(0), "STARTERPACK_ADMIN_ZERO_ADDRESS");
        require(sandContractAddress != address(0), "SAND_ZERO_ADDRESS");
        require(trustedForwarder != address(0), "FORWARDER_ZERO_ADDRESS");
        require(initialWalletAddress != address(0), "WALLET_ZERO_ADDRESS");
        require(registry != address(0), "REGISTRY_ZERO_ADDRESS");
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(STARTERPACK_ROLE, starterPackAdmin);
        _sand = sandContractAddress;
        _wallet = initialWalletAddress;
        _registry = registry;
    }

    /// @notice Set the wallet receiving the proceeds
    /// @param newReceivingWallet Address of the new receiving wallet
    function setReceivingWallet(address payable newReceivingWallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newReceivingWallet != address(0), "WALLET_ZERO_ADDRESS");
        require(newReceivingWallet != _wallet, "WALLET_ALREADY_SET");
        _wallet = newReceivingWallet;
        emit ReceivingWallet(newReceivingWallet);
    }

    /// @dev Enable / disable the specific SAND payment for StarterPacks
    /// @param enabled Whether to enable or disable
    function setSANDEnabled(bool enabled) external onlyRole(STARTERPACK_ROLE) {
        _sandEnabled = enabled;
        emit SandEnabled(enabled);
    }

    /// @notice Enables admin to change the prices (in SAND) of the catalysts and gems in the StarterPack bundle
    /// @param catalystIds Array of catalyst IDs for which new prices will take effect after a delay period
    /// @param catalystPrices Array of new catalyst prices that will take effect after a delay period
    /// @param gemIds Array of gem IDs for which new prices will take effect after a delay period
    /// @param gemPrices Array of new gems prices that will take effect after a delay period
    function setPrices(
        uint16[] calldata catalystIds,
        uint256[] calldata catalystPrices,
        uint16[] calldata gemIds,
        uint256[] calldata gemPrices
    ) external onlyRole(STARTERPACK_ROLE) {
        require(block.timestamp > _priceChangeTimestamp + PRICE_CHANGE_DELAY, "DELAY_PERIOD_IN_EFFECT");
        require(catalystIds.length == catalystPrices.length, "INVALID_CAT_INPUT");
        require(gemIds.length == gemPrices.length, "INVALID_GEM_INPUT");
        require(catalystPrices.length <= MAX_UINT16, "TOO_MANY_CATALYST_PRICES");
        require(gemPrices.length <= MAX_UINT16, "TOO_MANY_GEM_PRICES");
        for (uint256 i = 0; i < catalystIds.length; i++) {
            uint16 id = catalystIds[i];
            require(_isValidCatalyst(id), "INVALID_CAT_ID");
            _catalystPreviousPrices[id] = _catalystPrices[id];
            _catalystPrices[id] = catalystPrices[i];
        }
        for (uint256 i = 0; i < gemIds.length; i++) {
            uint16 id = gemIds[i];
            require(_isValidGem(id), "INVALID_GEM_ID");
            _gemPreviousPrices[id] = _gemPrices[id];
            _gemPrices[id] = gemPrices[i];
        }
        _priceChangeTimestamp = block.timestamp;
        emit SetPrices(catalystIds, catalystPrices, gemIds, gemPrices, _priceChangeTimestamp);
    }

    /// @notice Enables admin to withdraw any remaining tokens
    /// @param to The destination address for the purchased Catalysts and Gems
    /// @param catalystIds The IDs of the catalysts to be transferred
    /// @param gemIds The IDs of the gems to be transferred
    /// @dev The sum length of catalystIds + gemIds must be <= MAX_WITHDRAWAL
    function withdrawAll(
        address to,
        uint16[] calldata catalystIds,
        uint16[] calldata gemIds
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(catalystIds.length + gemIds.length <= MAX_WITHDRAWAL, "TOO_MANY_IDS");
        require(to != address(0), "ZERO_ADDRESS");
        for (uint256 i = 0; i < catalystIds.length; i++) {
            uint16 id = catalystIds[i];
            require(_isValidCatalyst(id), "INVALID_CATALYST_ID");
            ICatalyst catalyst = _getCatalyst(id);
            uint256 balance = catalyst.balanceOf(address(this));
            _executeRegistryTransferCatalyst(catalyst, address(this), to, balance);
        }
        for (uint256 i = 0; i < gemIds.length; i++) {
            uint16 id = gemIds[i];
            require(_isValidGem(id), "INVALID_GEM_ID");
            IGem gem = _getGem(id);
            uint256 balance = gem.balanceOf(address(this));
            _executeRegistryTransferGem(gem, address(this), to, balance);
        }
        emit WithdrawAll(to, catalystIds, gemIds);
    }

    /// @notice Purchase StarterPacks with SAND
    /// @dev The buyer param is duplicated outside the message so the function is compatible with Sand approveAndCall
    /// @dev The buyer param is included inside the message so it is clear it is part of the message to be signed
    /// @dev If Sand amount is not approved then Sand amount will fail in Sand transferFrom
    /// @param buyer The recipient of the Catalysts and Gems to be purchased
    /// @param message A message containing information about the Catalysts and Gems to be purchased together with the destination (buyer) and a nonce
    /// @param signature A signed message specifying tx details
    function purchaseWithSAND(
        address buyer,
        Message calldata message,
        bytes calldata signature
    ) external {
        require(buyer == message.buyer, "INVALID_BUYER");
        require(_sandEnabled, "SAND_IS_NOT_ENABLED");
        require(
            _isPurchaseValid(
                message.buyer,
                message.catalystIds,
                message.catalystQuantities,
                message.gemIds,
                message.gemQuantities,
                message.nonce,
                signature
            ),
            "INVALID_PURCHASE"
        );
        uint256 amountInSAND =
            _calculateTotalPriceInSAND(
                message.catalystIds,
                message.catalystQuantities,
                message.gemIds,
                message.gemQuantities
            );
        _transferSANDPayment(message.buyer, _wallet, amountInSAND);
        _transferCatalysts(message.catalystIds, message.catalystQuantities, message.buyer);
        _transferGems(message.gemIds, message.gemQuantities, message.buyer);
        emit Purchase(message.buyer, message, amountInSAND, _sand);
    }

    /// @notice Get current StarterPack prices for catalysts and gems by id
    /// @param catalystIds The IDs of the catalysts you want to obtain price information for
    /// @param gemIds The IDs of the gems you want to obtain price information for
    /// @return catalystPricesBeforeSwitch Catalyst prices before price change
    /// @return catalystPricesAfterSwitch Catalyst prices after price change
    /// @return gemPricesBeforeSwitch Gem prices before price change
    /// @return gemPricesAfterSwitch Gem prices after price change
    /// @return switchTime The time the latest price change will take effect, being the time of the price change plus the price change delay
    function getPrices(uint16[] calldata catalystIds, uint16[] calldata gemIds)
        external
        view
        returns (
            uint256[] memory,
            uint256[] memory,
            uint256[] memory,
            uint256[] memory,
            uint256
        )
    {
        uint256 switchTime = 0;
        // check whether any prices have been set; return switchTime = 0 if prices were never set
        if (_priceChangeTimestamp != 0) {
            switchTime = _priceChangeTimestamp + PRICE_CHANGE_DELAY;
        }
        uint256[] memory catalystPricesBeforeSwitch = new uint256[](catalystIds.length);
        uint256[] memory catalystPricesAfterSwitch = new uint256[](catalystIds.length);
        uint256[] memory gemPricesBeforeSwitch = new uint256[](gemIds.length);
        uint256[] memory gemPricesAfterSwitch = new uint256[](gemIds.length);
        for (uint256 i = 0; i < catalystIds.length; i++) {
            uint16 id = catalystIds[i];
            catalystPricesBeforeSwitch[i] = _catalystPreviousPrices[id];
            catalystPricesAfterSwitch[i] = _catalystPrices[id];
        }
        for (uint256 i = 0; i < gemIds.length; i++) {
            uint16 id = gemIds[i];
            gemPricesBeforeSwitch[i] = _gemPreviousPrices[id];
            gemPricesAfterSwitch[i] = _gemPrices[id];
        }
        return (
            catalystPricesBeforeSwitch,
            catalystPricesAfterSwitch,
            gemPricesBeforeSwitch,
            gemPricesAfterSwitch,
            switchTime
        );
    }

    /// @notice Return whether SAND payments are enabled
    /// @return Whether SAND payments are enabled
    function isSANDEnabled() external view returns (bool) {
        return _sandEnabled;
    }

    /// @notice Get the beneficiary wallet.
    /// @return the address of the receiving wallet
    function getReceivingWallet() external view returns (address) {
        return _wallet;
    }

    /// @notice Verify the total expected price to pay in SAND
    /// @param catalystIds An array of catalyst IDs to be purchased
    /// @param catalystQuantities An array of catalyst amounts to be purchased
    /// @param gemIds An array of gem IDs to be purchased
    /// @param gemQuantities An array of gem amounts to be purchased
    /// @return the total price to pay in SAND for the cats and gems in the bundle
    function calculateTotalPriceInSAND(
        uint16[] memory catalystIds,
        uint256[] memory catalystQuantities,
        uint16[] memory gemIds,
        uint256[] memory gemQuantities
    ) external view returns (uint256) {
        return _calculateTotalPriceInSAND(catalystIds, catalystQuantities, gemIds, gemQuantities);
    }

    function _transferCatalysts(
        uint16[] memory catalystIds,
        uint256[] memory catalystQuantities,
        address buyer
    ) internal {
        for (uint256 i = 0; i < catalystIds.length; i++) {
            uint16 id = catalystIds[i];
            require(_isValidCatalyst(id), "INVALID_CATALYST_ID");
            _executeRegistryTransferCatalyst(_getCatalyst(id), address(this), buyer, catalystQuantities[i]);
        }
    }

    function _transferGems(
        uint16[] memory gemIds,
        uint256[] memory gemQuantities,
        address buyer
    ) internal {
        for (uint256 i = 0; i < gemIds.length; i++) {
            uint16 id = gemIds[i];
            require(_isValidGem(id), "INVALID_GEM_ID");
            _executeRegistryTransferGem(_getGem(id), address(this), buyer, gemQuantities[i]);
        }
    }

    function _executeRegistryTransferCatalyst(
        ICatalyst catalyst,
        address from,
        address to,
        uint256 quantity
    ) private {
        require(catalyst.transferFrom(from, to, quantity), "CATALYST_TRANSFER_FAILED");
    }

    function _executeRegistryTransferGem(
        IGem gem,
        address from,
        address to,
        uint256 quantity
    ) private {
        require(gem.transferFrom(from, to, quantity), "GEM_TRANSFER_FAILED");
    }

    function _getCatalyst(uint16 catalystId) internal view returns (ICatalyst) {
        return GemsCatalystsRegistry(_registry).getCatalyst(catalystId);
    }

    function _isValidCatalyst(uint16 catalystId) internal view returns (bool) {
        return GemsCatalystsRegistry(_registry).doesCatalystExist(catalystId) && catalystId > 0;
    }

    function _getGem(uint16 gemId) internal view returns (IGem) {
        return GemsCatalystsRegistry(_registry).getGem(gemId);
    }

    function _isValidGem(uint16 gemId) internal view returns (bool) {
        return GemsCatalystsRegistry(_registry).doesGemExist(gemId) && gemId > 0;
    }

    /// @dev Function to calculate the total price in SAND of the StarterPacks to be purchased
    function _calculateTotalPriceInSAND(
        uint16[] memory catalystIds,
        uint256[] memory catalystQuantities,
        uint16[] memory gemIds,
        uint256[] memory gemQuantities
    ) internal view returns (uint256) {
        require(catalystIds.length == catalystQuantities.length, "INVALID_CAT_INPUT");
        require(gemIds.length == gemQuantities.length, "INVALID_GEM_INPUT");
        uint256 totalPrice;
        bool useCurrentPrices = _priceSelector();
        for (uint256 i = 0; i < catalystIds.length; i++) {
            uint16 id = catalystIds[i];
            uint256 quantity = catalystQuantities[i];
            totalPrice =
                totalPrice +
                (useCurrentPrices ? _catalystPrices[id] * (quantity) : _catalystPreviousPrices[id] * (quantity));
        }
        for (uint256 i = 0; i < gemIds.length; i++) {
            uint16 id = gemIds[i];
            uint256 quantity = gemQuantities[i];
            totalPrice =
                totalPrice +
                (useCurrentPrices ? _gemPrices[id] * (quantity) : _gemPreviousPrices[id] * (quantity));
        }
        return totalPrice;
    }

    /// @dev Function to determine whether to purchase with previous or current prices
    function _priceSelector() internal view returns (bool) {
        return block.timestamp >= _priceChangeTimestamp + PRICE_CHANGE_DELAY;
    }

    /// @dev Function to handle purchase with SAND
    function _transferSANDPayment(
        address buyer,
        address payable paymentRecipient,
        uint256 amount
    ) internal {
        uint256 amountForDestination = amount;
        require(IERC20(_sand).transferFrom(buyer, paymentRecipient, amountForDestination), "PAYMENT_TRANSFER_FAILED");
    }

    /// @dev this override is required; two or more base classes define function
    function _msgSender() internal view override(Context, ERC2771HandlerV2) returns (address sender) {
        return ERC2771HandlerV2._msgSender();
    }

    /// @dev this override is required; two or more base classes define function
    function _msgData() internal view override(Context, ERC2771HandlerV2) returns (bytes calldata) {
        return ERC2771HandlerV2._msgData();
    }
}
