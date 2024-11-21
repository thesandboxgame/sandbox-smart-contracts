# land-sale

The land-sale package outlines the process for deploying Land Presale
smartcontracts for The Sandbox's metaverse.

## Architecture

This package manages deployments for Land sales. The package contains 2 main
contracts:

| Component                                              | Description                                                                        |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| [AuthValidator](contracts/AuthValidator.sol)           | contract which verifies that only a trusted wallet can authorize land sale actions |
| [EstateSaleWithAuth](contracts/EstateSaleWithAuth.sol) | contract used to create and manage land sales in the metaverse.                    |

- It leverages two key files:
- **bundles.testnet.json**: Specifies optional asset bundles sold with certain
  Lands.
- **sectors.testnet.json**: Defines the sectors being deployed. Deploy a new
  Land Presale contract for each sector using the `EstateSaleWithAuth` template,
  as shown in the deploy script.
- **No need for new deploy scripts**: Instead of creating a new deploy script
  for each sale, the existing script is updated with the newsectors.
- **Set a Deadline**: A deadline must be specified in
  `land-sale/data/deadlines.ts`.
- For mainnet deadline will be of six months and for testnet this deadline is
  ignored by the script.

## Getting Started

### Step 1: Prepare for Deployment

- **Receive JSON Files**: The Landsale team will provide `bundles.testnet.json`
  and `sectors.testnet.json` files.
- **Organize the Files**: Place the JSON files in a new folder within
  `land-sale/data/landSales` named `LandPreSale_XX`.
- **NOTE**: Here, `XX` is an incremented folder number that does not correspond
  to sector numbers.
- Add `LandPreSale_XX` to the
  `packages/deploy/deploy/1000_landsale/02_deploy_estate_sale.ts` section in the
  deployment file in the format:
  `{name: 'LandPreSale_XX', skip: async () => false}`,

### Step 2: Manage Secrets

- For testnet, the secret file is automatically generated in the deploy folder.
- For mainnet, you must manually create a file at
  `land-sale/data/secret/estate-sale/.LandPreSale_XX_testnet_secret`, where XX
  is the sector number, and note that the mainnet secret differs from the
  testnet secret.

---

## Sample files

### bundles.test.json :

```
{
  "bundleId":
   [
     bundle-Id
   ]
}
```

### sectors.testnet.json :

```
[
  {
    "sector": sector_number,
    "lands": [
      {
        "coordinateX": X-coordinate,
        "coordinateY": Y-coordinate,
        "ownerAddress": "",
        "bundleId": bundle-Id
      }
    ]
  }
]
```

### deadlines.ts :

- The deadline represents the timestamp (in seconds) until which the land sale
  contract for each sector will remain active, with the deadline number
  corresponding to the sector number.
- Place the deadline in `land-sale/data/deadlines.ts`

```
sector_number: new Date('YYYY-MM-DDT12:00:00.000Z').valueOf() / 1000
```

---

## Running the project locally

- Make sure you navigate to the `deploy` package directory before running any
  commands
- Create a new `.env` file by copying the structure from `.env.example`
- Ensure you replace any placeholder values with the actual configuration needed
  for your environment.
- Install dependencies with `yarn`

To execute the deployment, run

- for fork deployment:
  `yarn fork:deploy --network NETWORK --tags TAG --no-impersonation`
- for live deployment: `yarn live:deploy --network NETWORK --tags TAG`
- where:
- `NETWORK` is the network name like: `polygon`, `mainet` etc
- `TAG` are the tags used to limit which deployment scripts will be executed
