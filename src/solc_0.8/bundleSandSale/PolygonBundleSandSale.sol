//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../common/interfaces/IERC20.sol";
import "../common/interfaces/Medianizer.sol";
import "../common/interfaces/IERC1155TokenReceiver.sol";
import "../common/BaseWithStorage/WithAdmin.sol";
import "../common/interfaces/IPolygonAssetERC1155.sol";

/// @title PolygonBundleSandSale contract.
/// @notice This contract receives bundles of: Assets (ERC1155) + Sand.
/// @notice Then those bundles are sold to users. Users can pay BaseCoin (Ethers) or Dais for the bundles.
contract PolygonBundleSandSale is WithAdmin, IERC1155TokenReceiver {
    bytes4 public constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 public constant ERC1155_BATCH_RECEIVED = 0xbc197c81;

    event BundleSale(
        uint256 indexed saleId,
        uint256[] ids,
        uint256[] amounts,
        uint256 sandAmount,
        uint256 priceUSD,
        uint256 numPacks
    );

    event BundleSold(
        uint256 indexed saleId,
        address indexed buyer,
        uint256 numPacks,
        address token,
        uint256 tokenAmount
    );

    Medianizer public medianizer;
    IERC20 public dai;
    IERC20 public sand;
    IPolygonAssetERC1155 public asset;
    address payable public receivingWallet;

    /*
        This is the main structure representing a pack to be sold.
        Each pack includes some Assets (NFTs or small collection of fungible tokens) plus Sand
    */
    struct Sale {
        uint256[] ids; // ids of the Assets in each pack
        uint256[] amounts; // Amount of each Asset  in each pack
        uint256 sandAmount; // Sands sold with each pack
        uint256 priceUSD; // Price in USD for each Pack u$s * 1e18 (aka: 1u$s == 1e18 wei)
        uint256 numPacksLeft; // Number of packs left, used for accounting
    }

    Sale[] private sales;

    constructor(
        IERC20 sandTokenContractAddress,
        IPolygonAssetERC1155 assetTokenContractAddress,
        Medianizer medianizerContractAddress,
        IERC20 daiTokenContractAddress,
        address admin,
        address payable receivingWallet_
    ) {
        require(receivingWallet_ != address(0), "need a wallet to receive funds");
        medianizer = medianizerContractAddress;
        sand = sandTokenContractAddress;
        asset = assetTokenContractAddress;
        dai = daiTokenContractAddress;
        _admin = admin;
        receivingWallet = receivingWallet_;
    }

    /// @notice set the wallet receiving the proceeds
    /// @param newWallet address of the new receiving wallet
    function setReceivingWallet(address payable newWallet) external onlyAdmin {
        require(newWallet != address(0), "receiving wallet cannot be zero address");
        receivingWallet = newWallet;
    }

    /**
     * @notice Buys Sand Bundle with Ether
     * @param saleId id of the bundle
     * @param numPacks the amount of packs to buy
     * @param to The address that will receive the SAND
     */
    function buyBundleWithEther(
        uint256 saleId,
        uint256 numPacks,
        address to
    ) external payable {
        (uint256 saleIndex, uint256 usdRequired) = _getSaleAmount(saleId, numPacks);
        uint256 ethRequired = getEtherAmountWithUSD(usdRequired);
        require(msg.value >= ethRequired, "not enough ether sent");
        uint256 leftOver = msg.value - ethRequired;
        if (leftOver > 0) {
            payable(msg.sender).transfer(leftOver);
            // refund extra
        }
        payable(receivingWallet).transfer(ethRequired);
        _transferPack(saleIndex, numPacks, to);

        emit BundleSold(saleId, msg.sender, numPacks, address(0), ethRequired);
    }

    /**
     * @notice Buys Sand Bundle with DAI
     * @param saleId id of the bundle
     * @param numPacks the amount of packs to buy
     * @param to The address that will receive the SAND
     */
    function buyBundleWithDai(
        uint256 saleId,
        uint256 numPacks,
        address to
    ) external {
        (uint256 saleIndex, uint256 usdRequired) = _getSaleAmount(saleId, numPacks);
        require(dai.transferFrom(msg.sender, receivingWallet, usdRequired), "failed to transfer dai");
        _transferPack(saleIndex, numPacks, to);

        emit BundleSold(saleId, msg.sender, numPacks, address(dai), usdRequired);
    }

    /**
     * @notice get a specific sale information
     * @param saleId id of the bundle
     * @return priceUSD price in USD
     * @return numPacksLeft number of packs left
     */
    function getSaleInfo(uint256 saleId) external view returns (uint256 priceUSD, uint256 numPacksLeft) {
        require(saleId > 0, "invalid saleId");
        uint256 saleIndex = saleId - 1;
        priceUSD = sales[saleIndex].priceUSD;
        numPacksLeft = sales[saleIndex].numPacksLeft;
    }

    /**
     * @notice Remove a sale returning everything to some address
     * @param saleId id of the bundle
     * @param to The address that will receive the SAND
     */
    function withdrawSale(uint256 saleId, address to) external onlyAdmin {
        require(saleId > 0, "invalid saleId");
        uint256 saleIndex = saleId - 1;
        uint256 numPacksLeft = sales[saleIndex].numPacksLeft;
        sales[saleIndex].numPacksLeft = 0;

        uint256[] memory ids = sales[saleIndex].ids;
        uint256[] memory amounts = sales[saleIndex].amounts;
        uint256 numIds = ids.length;
        for (uint256 i = 0; i < numIds; i++) {
            amounts[i] = amounts[i] * numPacksLeft;
        }
        require(
            sand.transferFrom(address(this), to, numPacksLeft * sales[saleIndex].sandAmount),
            "transfer fo Sand failed"
        );
        asset.safeBatchTransferFrom(address(this), to, ids, amounts, "");
    }

    /**
     * @notice IERC1155TokenReceiver callback, creates a new Sale
     * @notice OBS: in the case of NFTs (one of a kind) value is one so numPacks must be 1 too to be divisible.
     */
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external override returns (bytes4) {
        require(address(asset) == msg.sender, "only accept asset as sender");
        require(from == operator, "only self executed transfer allowed");
        require(value > 0, "no Asset transfered");
        require(data.length > 0, "data need to contains the sale data");

        (uint256 numPacks, uint256 sandAmountPerPack, uint256 priceUSDPerPack) =
            abi.decode(data, (uint256, uint256, uint256));

        uint256 amount = value / numPacks;
        require(amount * numPacks == value, "invalid amounts, not divisible by numPacks");
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        uint256[] memory ids = new uint256[](1);
        ids[0] = id;
        _setupBundle(from, sandAmountPerPack, numPacks, ids, amounts, priceUSDPerPack);
        return ERC1155_RECEIVED;
    }

    /**
     * @notice IERC1155TokenReceiver callback, creates a new Sale
     * @notice OBS: in the case of NFTs (one of a kind) value is one so numPacks must be 1 too to be divisible.
     */
    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external override returns (bytes4) {
        require(address(asset) == msg.sender, "only accept asset as sender");
        require(from == operator, "only self executed transfer allowed");
        require(ids.length > 0, "need to contains Asset");
        require(data.length > 0, "data need to contains the sale data");

        (uint256 numPacks, uint256 sandAmountPerPack, uint256 priceUSDPerPack) =
            abi.decode(data, (uint256, uint256, uint256));

        uint256[] memory amounts = new uint256[](ids.length);
        for (uint256 i = 0; i < amounts.length; i++) {
            require(values[i] > 0, "asset transfer with zero values");
            uint256 amount = values[i] / numPacks;
            require(amount * numPacks == values[i], "invalid amounts, not divisible by numPacks");
            amounts[i] = amount;
        }

        _setupBundle(from, sandAmountPerPack, numPacks, ids, amounts, priceUSDPerPack);
        return ERC1155_BATCH_RECEIVED;
    }

    /**
     * @notice Returns the amount of ETH for a specific amount
     * @notice This rounds down with a precision of 1wei if usdAmount price is expressed in u$s * 10e18
     * @param usdAmount An amount of USD
     * @return The amount of ETH
     */
    function getEtherAmountWithUSD(uint256 usdAmount) public view returns (uint256) {
        uint256 ethUsdPair = getEthUsdPair();
        return (usdAmount * 1 ether) / ethUsdPair;
    }

    /**
     * @notice Gets the ETHUSD pair from the Medianizer contract
     * @return The pair as an uint256
     */
    function getEthUsdPair() internal view returns (uint256) {
        bytes32 pair = medianizer.read();
        return uint256(pair);
    }

    function _transferPack(
        uint256 saleIndex,
        uint256 numPacks,
        address to
    ) internal {
        uint256 sandAmountPerPack = sales[saleIndex].sandAmount;
        require(sand.transferFrom(address(this), to, sandAmountPerPack * numPacks), "Sand Transfer failed");
        uint256[] memory ids = sales[saleIndex].ids;
        uint256[] memory amounts = sales[saleIndex].amounts;
        uint256 numIds = ids.length;
        for (uint256 i = 0; i < numIds; i++) {
            amounts[i] = amounts[i] * numPacks;
        }
        asset.safeBatchTransferFrom(address(this), to, ids, amounts, "");
    }

    /**
     * @notice Create a Sale to be sold.
     * @param from seller address
     * @param sandAmountPerPack the sands that will be sell with the Sale
     * @param numPacks number of packs that this sale contains
     * @param ids list of ids to create bundle from
     * @param amounts the corresponding amounts of assets to be bundled for sale
     * @param priceUSDPerPack price in USD per pack
     */
    function _setupBundle(
        address from,
        uint256 sandAmountPerPack,
        uint256 numPacks,
        uint256[] memory ids,
        uint256[] memory amounts,
        uint256 priceUSDPerPack
    ) internal {
        require(sand.transferFrom(from, address(this), sandAmountPerPack * numPacks), "failed to transfer Sand");
        sales.push(
            Sale({
                ids: ids,
                amounts: amounts,
                sandAmount: sandAmountPerPack,
                priceUSD: priceUSDPerPack,
                numPacksLeft: numPacks
            })
        );
        uint256 saleId = sales.length;
        emit BundleSale(saleId, ids, amounts, sandAmountPerPack, priceUSDPerPack, numPacks);
    }

    function _getSaleAmount(uint256 saleId, uint256 numPacks)
        internal
        returns (uint256 saleIndex, uint256 usdRequired)
    {
        require(saleId > 0, "PolygonBundleSandSale: invalid saleId");
        saleIndex = saleId - 1;
        uint256 numPacksLeft = sales[saleIndex].numPacksLeft;
        require(numPacksLeft >= numPacks, "PolygonBundleSandSale: not enough packs on sale");
        sales[saleIndex].numPacksLeft = numPacksLeft - numPacks;

        usdRequired = numPacks * sales[saleIndex].priceUSD;
    }
}
