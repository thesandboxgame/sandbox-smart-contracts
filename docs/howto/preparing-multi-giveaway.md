---
description: Preparing a multi giveaway
---

# How to prepare a multi giveaway ?

If you haven't done it, follow the [getting started](../intro/index.md) tutorial first.

All resources can be found on this [google folder](https://drive.google.com/drive/u/1/folders/1Q9FYQhEdlTVlqAMPheoEz1CAFQMqGJJV).

What to do first:

- create a new folder with the name of this new giveaway
- copy the file _MultiGiveaway Template_ in your newly created folder
- This file will lead you in all step needed to do a multi giveaway

## Generating JSON file with every asset and associated data

You have to use (or create) a script using the graph or other data source depending on the context, to create a JSON file containing asset IDs and amounts.

JSON format:

```json
[
  {
    "to": "0x9E7A5b836Da4d55D681Eed4495370e96295c785f", // recipient of the assets
    "erc1155": [
      {
        "ids": [
          // array of asset id
          "106914169990095390281037231343508379541260342522117732053367995686304065005572",
          "106914169990095390281037231343508379541260342522117732053367995686304065005568"
        ],
        "values": [
          // array of amount for each asset id
          1,
          1
        ],
        "contractAddress": "0xa342f5D851E866E18ff98F351f2c6637f4478dB5" // address of asset contract (most of the time our contract 0xa342f5D851E866E18ff98F351f2c6637f4478dB5)
      }
    ],
    "erc721": [], // empty
    "erc20": {
      // empty
      "amounts": [],
      "contractAddresses": []
    }
  }
]
```

Save your script (if you had to create one) in the repos and add the link to it in the first paragraph of the _MultiGiveaway Template_ file.
Save also your JSON file in the _data/giveaways/multi_giveaway_1_ folder.

## Execute script to setup and add giveaway

###Setup your giveaway

`yarn execute mainnet setup/add_new_multi_giveaway.ts Multi_Giveaway_1 <your_json_filename>`

example:

`yarn execute mainnet .\setup\add_new_multi_giveaway.ts Multi_Giveaway_1 multi_giveaway_moon_cats`

###send asset

`yarn execute mainnet setup/send_assets_to_multi_giveaway.ts Multi_Giveaway_1 <multi_giveaway_name>`

example:

`yarn execute mainnet .\setup\send_assets_to_multi_giveaway.ts Multi_Giveaway_1 giveaway_red_village`

### Add reference in the _MultiGiveaway Template_ file

When indicated on the template file, add the root hash and also the resulting Json file name found in the .secret folder. And copy these files in your google folder.

That's all.
