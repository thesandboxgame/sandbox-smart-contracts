//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../../../../catalyst/interfaces/IAssetAttributesRegistry.sol";

// used to reduce PolygonAssetV2 contract code size
library AssetHelper {
    struct AssetRegistryData {
        IAssetAttributesRegistry assetRegistry;
    }

    function setCatalystDatas(
        AssetRegistryData storage self,
        IAssetAttributesRegistry.AssetGemsCatalystData[] memory assetGemsCatalystData
    ) public {
        for (uint256 i = 0; i < assetGemsCatalystData.length; i++) {
            require(assetGemsCatalystData[i].catalystContractId > 0, "WRONG_catalystContractId");
            require(assetGemsCatalystData[i].assetId != 0, "WRONG_assetId");

            self.assetRegistry.setCatalystWhenDepositOnOtherLayer(
                assetGemsCatalystData[i].assetId,
                assetGemsCatalystData[i].catalystContractId,
                assetGemsCatalystData[i].gemContractIds
            );
        }
    }

    function decodeData(AssetRegistryData storage self, bytes calldata depositData)
        public
        returns (
            uint256[] memory ids,
            uint256[] memory amounts,
            bytes32[] memory hashes
        )
    {
        bytes memory data;
        IAssetAttributesRegistry.AssetGemsCatalystData[] memory catalystDatas;
        (ids, amounts, data) = abi.decode(depositData, (uint256[], uint256[], bytes));
        (hashes, catalystDatas) = abi.decode(data, (bytes32[], IAssetAttributesRegistry.AssetGemsCatalystData[]));
        setCatalystDatas(self, catalystDatas);
    }
}
