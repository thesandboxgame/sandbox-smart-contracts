// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {IMultiRoyaltyRecipients} from "@sandbox-smart-contracts/dependency-royalty-management/contracts/interfaces/IMultiRoyaltyRecipients.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Recipient} from "@manifoldxyz/royalty-registry-solidity/contracts/overrides/IRoyaltySplitter.sol";
import {IRoyaltiesProvider, BASIS_POINTS} from "./interfaces/IRoyaltiesProvider.sol";

/// @author The Sandbox
/// @title RoyaltiesRegistry
/// @dev Contract managing the registry of royalties.
contract RoyaltiesRegistry is OwnableUpgradeable, IRoyaltiesProvider {
    using ERC165CheckerUpgradeable for address;
    /// @notice Emitted when royalties are set for a token.
    /// @param token The token address for which royalties are set.
    /// @param royalties An array of royalties set for the token.
    event RoyaltiesSetForContract(address indexed token, Part[] royalties);

    /// @notice Emitted when the royalties type and provider are defined for a token.
    /// @param token The token address.
    /// @param royaltiesType The type of royalties set.
    /// @param royaltiesProvider The address of the royalties provider.
    event RoyaltiesTypeSet(
        address indexed token,
        RoyaltiesType indexed royaltiesType,
        address indexed royaltiesProvider
    );

    /// @dev Stores royalty information for tokens.
    struct RoyaltiesSet {
        bool initialized;
        Part[] royalties;
    }

    /// @dev Represents a type of royalties.
    enum RoyaltiesType {
        UNSET,
        BY_TOKEN,
        EXTERNAL_PROVIDER,
        EIP2981,
        UNSUPPORTED_NONEXISTENT
    }

    /// @dev Used to call EIP2981 royaltyInfo to calculate the royalties percentage
    uint256 public constant WEIGHT_VALUE = 1e6;

    /// @notice Stores royalties for token contract, set in setRoyaltiesByToken() method
    mapping(address token => RoyaltiesSet royalties) public royaltiesByToken;

    /// @notice Stores external provider and royalties type for token contract
    mapping(address token => uint256 provider) public royaltiesProviders;

    /// @dev This protects the implementation contract from being initialized.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Royalties registry initializer
    // solhint-disable-next-line func-name-mixedcase
    function __RoyaltiesRegistry_init() external initializer {
        __Ownable_init();
    }

    /// @notice Assigns an external provider for a token's royalties and sets the royalty type as 'EXTERNAL_PROVIDER' (4).
    /// @param token Address of the token.
    /// @param provider Address of the external royalties provider.
    function setProviderByToken(address token, address provider) external {
        _checkOwner(token);
        _setRoyaltiesType(token, RoyaltiesType.EXTERNAL_PROVIDER, provider);
    }

    /// @notice Fetches the royalty type for a given token.
    /// @param token Address of the token.
    /// @return The type of royalty associated with the token.
    function getRoyaltiesType(address token) external view returns (RoyaltiesType) {
        return _getRoyaltiesType(royaltiesProviders[token]);
    }

    /// @notice Overwrites the royalty type for a given token.
    /// @param token Address of the token.
    /// @param royaltiesType The new royalty type to be set.
    function forceSetRoyaltiesType(address token, RoyaltiesType royaltiesType) external {
        _checkOwner(token);
        _setRoyaltiesType(token, royaltiesType, getProvider(token));
    }

    /// @notice Resets the royalty type for a token to 'UNSET'.
    /// @param token Address of the token.
    function clearRoyaltiesType(address token) external {
        _checkOwner(token);
        royaltiesProviders[token] = uint256(uint160(getProvider(token)));

        emit RoyaltiesTypeSet(token, RoyaltiesType.UNSET, getProvider(token));
    }

    /// @notice Defines royalties for a token and sets the royalty type as 'BY_TOKEN'.
    /// @param token Address of the token.
    /// @param royalties Array of royalty parts to be set for the token.
    function setRoyaltiesByToken(address token, Part[] memory royalties) external {
        _checkOwner(token);
        //clearing royaltiesProviders value for the token
        delete royaltiesProviders[token];
        // setting royaltiesType = 1 for the token
        _setRoyaltiesType(token, RoyaltiesType.BY_TOKEN, address(0));
        uint256 sumRoyalties = 0;
        delete royaltiesByToken[token];
        for (uint256 i = 0; i < royalties.length; ++i) {
            require(royalties[i].account != address(0x0), "recipient should be present");
            require(royalties[i].value != 0, "royalty value should be > 0");
            royaltiesByToken[token].royalties.push(royalties[i]);
            sumRoyalties += royalties[i].value;
        }
        require(sumRoyalties < BASIS_POINTS, "royalties sum more, than 100%");
        royaltiesByToken[token].initialized = true;
        emit RoyaltiesSetForContract(token, royalties);
    }

    /// @notice Fetches royalties for a given token and token ID.
    /// @param token Address of the token.
    /// @param tokenId ID of the token.
    /// @return An array containing royalty parts.
    function getRoyalties(address token, uint256 tokenId) external returns (Part[] memory) {
        uint256 royaltiesProviderData = royaltiesProviders[token];

        address royaltiesProvider = address(uint160(royaltiesProviderData));
        RoyaltiesType royaltiesType = _getRoyaltiesType(royaltiesProviderData);

        // case when royaltiesType is not set
        if (royaltiesType == RoyaltiesType.UNSET) {
            // calculating royalties type for token
            royaltiesType = _calculateRoyaltiesType(token, royaltiesProvider);

            //saving royalties type
            _setRoyaltiesType(token, royaltiesType, royaltiesProvider);
        }

        //case royaltiesType = 1, royalties are set in royaltiesByToken
        if (royaltiesType == RoyaltiesType.BY_TOKEN) {
            return royaltiesByToken[token].royalties;
        }

        //case royaltiesType = 2, royalties from external provider
        if (royaltiesType == RoyaltiesType.EXTERNAL_PROVIDER) {
            return _providerExtractor(token, tokenId, royaltiesProvider);
        }

        //case royaltiesType = 3, royalties EIP-2981
        if (royaltiesType == RoyaltiesType.EIP2981) {
            return _getRoyaltiesEIP2981(token, tokenId);
        }

        // case royaltiesType = 4, unknown/empty royalties
        return new Part[](0);
    }

    /// @notice Returns provider address for token contract from royaltiesProviders mapping
    /// @param token token address
    /// @return address of provider
    function getProvider(address token) public view returns (address) {
        return address(uint160(royaltiesProviders[token]));
    }

    /// @notice Returns the royalties type for a given raw data value.
    /// @param data The raw data (uint256).
    /// @return The derived royalties type.
    function _getRoyaltiesType(uint256 data) internal pure returns (RoyaltiesType) {
        for (uint256 i = 1; i <= uint256(type(RoyaltiesType).max); ++i) {
            if (data / 2 ** (256 - i) == 1) {
                return RoyaltiesType(i);
            }
        }
        return RoyaltiesType.UNSET;
    }

    /// @notice Sets the royalties type and provider for a given token contract.
    /// @param token The address of the token.
    /// @param royaltiesType The type of royalties to be set.
    /// @param royaltiesProvider The address of the royalties provider.
    function _setRoyaltiesType(address token, RoyaltiesType royaltiesType, address royaltiesProvider) internal {
        require(royaltiesType != RoyaltiesType.UNSET, "wrong royaltiesType");
        royaltiesProviders[token] = uint256(uint160(royaltiesProvider)) + 2 ** (256 - uint256(royaltiesType));
        emit RoyaltiesTypeSet(token, royaltiesType, royaltiesProvider);
    }

    /// @notice Validates if the message sender is the owner of the contract or the given token.
    /// @param token Address of the token to check against.
    function _checkOwner(address token) internal view {
        if ((owner() != _msgSender()) && (OwnableUpgradeable(token).owner() != _msgSender())) {
            revert("token owner not detected");
        }
    }

    /// @notice Determines the royalties type for a given token.
    /// @param token Address of the token.
    /// @param royaltiesProvider Address of the royalties provider.
    /// @return The determined royalties type.
    function _calculateRoyaltiesType(address token, address royaltiesProvider) internal view returns (RoyaltiesType) {
        if (token.supportsInterface(type(IERC2981).interfaceId)) {
            return RoyaltiesType.EIP2981;
        }

        if (royaltiesProvider != address(0)) {
            return RoyaltiesType.EXTERNAL_PROVIDER;
        }

        return RoyaltiesType.UNSUPPORTED_NONEXISTENT;
    }

    /// @notice Fetches EIP-2981 royalties for a given token ID.
    /// @param token Address of the token.
    /// @param tokenId ID of the token for which royalties are to be fetched.
    /// @return An array of parts representing the royalties.
    function _getRoyaltiesEIP2981(address token, uint256 tokenId) internal view returns (Part[] memory) {
        try IERC2981(token).royaltyInfo(tokenId, WEIGHT_VALUE) returns (address receiver, uint256 royaltyAmount) {
            if (token.supportsInterface(type(IMultiRoyaltyRecipients).interfaceId)) {
                return _getRecipients(token, tokenId, receiver, royaltyAmount);
            } else {
                return _calculateRoyalties(receiver, royaltyAmount);
            }
        } catch {
            return new Part[](0);
        }
    }

    /// @notice Fetches the recipients and calculates the royalties.
    /// @param token Address of the token.
    /// @param tokenId ID of the token.
    /// @param receiver Address of the royalty receiver.
    /// @param royaltyAmount The total royalty amount.
    /// @return An array of parts representing the royalties.
    function _getRecipients(
        address token,
        uint256 tokenId,
        address receiver,
        uint256 royaltyAmount
    ) internal view returns (Part[] memory) {
        try IMultiRoyaltyRecipients(token).getRecipients(tokenId) returns (Recipient[] memory multiRecipients) {
            uint256 multiRecipientsLength = multiRecipients.length;
            Part[] memory royalties = new Part[](multiRecipientsLength);
            uint256 sum = 0;
            for (uint256 i; i < multiRecipientsLength; i++) {
                Recipient memory splitRecipient = multiRecipients[i];
                royalties[i].account = splitRecipient.recipient;
                uint256 splitAmount = (splitRecipient.bps * royaltyAmount) / WEIGHT_VALUE;
                royalties[i].value = splitAmount;
                sum += splitAmount;
            }
            // sum can be less than amount, otherwise small-value listings can break
            require(sum <= royaltyAmount, "RoyaltiesRegistry: Invalid split");
            return royalties;
            // solhint-disable-next-line no-empty-blocks
        } catch {}

        return _calculateRoyalties(receiver, royaltyAmount);
    }

    /// @notice Fetches royalties for a given token ID from an external provider.
    /// @param token Address of the token.
    /// @param tokenId ID of the token for which royalties are to be fetched.
    /// @param providerAddress Address of the external provider.
    /// @return An array of parts representing the royalties.
    function _providerExtractor(
        address token,
        uint256 tokenId,
        address providerAddress
    ) internal returns (Part[] memory) {
        try IRoyaltiesProvider(providerAddress).getRoyalties(token, tokenId) returns (Part[] memory result) {
            return result;
        } catch {
            return new Part[](0);
        }
    }

    /// @notice Converts a given amount to its percentage representation and forms a royalty part.
    /// @param to Address of the royalty recipient.
    /// @param amount Amount of the royalty.
    /// @return An array containing the formed royalty part.
    function _calculateRoyalties(address to, uint256 amount) internal pure returns (Part[] memory) {
        Part[] memory result;
        if (amount == 0) {
            return result;
        }
        uint256 percent = (amount * BASIS_POINTS) / WEIGHT_VALUE;
        require(percent < BASIS_POINTS, "royalties 2981 exceeds 100%");
        result = new Part[](1);
        result[0].account = to;
        result[0].value = percent;
        return result;
    }

    // slither-disable-next-line unused-state
    uint256[50] private __gap;
}
