#### Features

This library contains struct `Order` with some functions for this struct:
- hash: calculates hash according to EIP-712 rules. you can find type definitions
- hashKey: calculates key for Order used to record fill of the order (orders with the same key considered as an update)
- validate: validates main order parameters, checks if `Order` can be processed
- calculateRemaining: calculates remaining part of the `Order` (if it's partially filled)

`Order` fields:
- `address` maker
- `Asset` leftAsset (see [LibAsset](../../lib-asset/LibAsset.md))
- `address` taker (can be zero address)
- `Asset` rightAsset (see [LibAsset](../../lib-asset/LibAsset.md))
- `uint` salt - random number to distinguish different maker's Orders
- `uint` start - Order can't be matched before this date (optional)
- `uint` end - Order can't be matched after this date (optional)

#### Types for EIP-712 signature:
```javascript
const Types = {
	AssetType: [
		{name: 'assetClass', type: 'bytes4'},
		{name: 'data', type: 'bytes'}
	],
	Asset: [
		{name: 'assetType', type: 'AssetType'},
		{name: 'value', type: 'uint256'}
	],
	Order: [
		{name: 'maker', type: 'address'},
		{name: 'makeAsset', type: 'Asset'},
		{name: 'taker', type: 'address'},
		{name: 'takeAsset', type: 'Asset'},
		{name: 'salt', type: 'uint256'},
		{name: 'start', type: 'uint256'},
		{name: 'end', type: 'uint256'},
	]
};
```
