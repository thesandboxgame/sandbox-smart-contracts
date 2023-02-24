# Description

To fix the duplicate signatures in the claiming data for multiple giveaways on Polygon, we have created a couple of scripts:

Both scripts require to copy of the final proof files containing the data for each claim.

The search-duplicates.ts script reads the proof files for duplicate salts and writes the search result to the output folder.

The regenerate.ts script reads the proof files, checks the claims made for each giveaway using The Graph, and creates a new file with unrealized claims, excluding banned wallets.

# Checklist

- [ ] Add script to detect duplicated giveaway salt signatures
- [ ] Add script to regenerate unclaimed giveaways.

# Check for duplicates

Copy proofs files from Amazon S3 to the following directory:
    
    sandbox-smart-contracts/scripts/giveaway/proofs/{network}/{giveaway}
    
After copying the files, we should have something like this:

    sandbox-smart-contracts/scripts/giveaway/proofs/mumbai/45/proofs
    sandbox-smart-contracts/scripts/giveaway/proofs/mumbai/64/proofs
    sandbox-smart-contracts/scripts/giveaway/proofs/mumbai/66/proofs
    sandbox-smart-contracts/scripts/giveaway/proofs/mumbai/73/proofs
    ...

Or for polygon mainnet:

    sandbox-smart-contracts/scripts/giveaway/proofs/polygon/45/proofs
    sandbox-smart-contracts/scripts/giveaway/proofs/polygon/64/proofs
    sandbox-smart-contracts/scripts/giveaway/proofs/polygon/66/proofs
    sandbox-smart-contracts/scripts/giveaway/proofs/polygon/73/proofs
    ...

Once in place the files to process, run the following command:

    yarn execute <NETWORK> ./scripts/giveaway/search-duplicates.ts

The script generates a CSV file:

    sandbox-smart-contracts/scripts/giveaway/output/mumbai/duplicates.csv

The content file looks like this:

    salt,giveaways
    0x6939b0d018927ad7420456e206727c8862eb2ebbdd79851165aa6b38e6061ed8,"268,269"
    0x114b2e829bd3ac68b46b9787b3f3d76c96cb325be9ac4d9108b8d8d1c8bf7e58,"268,269"
    0x3014a81f15cbf6084454c06a95f984e39f68964e1b9c83b0fde9f81e10d97fd9,"268,269"
    0xbf260a18800fd90ac0f898501f5eb4da09a1c7d1725b17ed682f4af2ef12a1e6,"268,269"

This file lets us know how many duplicate salts we have and what giveaways are involved.

# Regenerate Claims

The script to regenerate will take all the claims existing in the proof file and check if they were already claimed. The script creates a new file with the list of unclaimed giveaways. This list does not include the claims for banned wallets. 

To exclude the banned wallets, it's required to put in place the file `deny_list_wallets.csv` provided by the anti-cheating team at the following path:

    sandbox-smart-contracts/scripts/giveaway

This file looks like this:

    user_wallet
    0x00000006o796df0489b6f16120e9a72bbc945t78
    0x000000a5694c92839fdbcef14245f7b8c4534098
    0x000000a4fc9e28e0fd2fa5fb5435cb10d9a45u90

The claims corresponding to banned wallets will be saved to a different file ending with _banned.json

e.g.:

    sandbox-smart-contracts/scripts/giveaway/output/mumbai/{giveaway}_banned.json

With the files to process in place, run the following command:

    yarn execute <NETWORK> ./scripts/giveaway/regenerate.ts

The script generates two output files for each giveaway:

    sandbox-smart-contracts/scripts/giveaway/output/mumbai/{giveaway}.json
    sandbox-smart-contracts/scripts/giveaway/output/mumbai/{giveaway}.csv

After running the script, we should have something like this:

    sandbox-smart-contracts/scripts/giveaway/output/mumbai/45.json
    sandbox-smart-contracts/scripts/giveaway/output/mumbai/45.csv
    sandbox-smart-contracts/scripts/giveaway/output/mumbai/64.json
    sandbox-smart-contracts/scripts/giveaway/output/mumbai/64.csv
    ...

Or for Polygon Mainnet:

    sandbox-smart-contracts/scripts/giveaway/output/polygon/45.json
    sandbox-smart-contracts/scripts/giveaway/output/polygon/45.csv
    sandbox-smart-contracts/scripts/giveaway/output/polygon/64.json
    sandbox-smart-contracts/scripts/giveaway/output/polygon/64.csv
    ...

The JSON file has the format to be processed with the current procedure (by hand). The CSV file has the format to be processed by the new giveaway back-office.
