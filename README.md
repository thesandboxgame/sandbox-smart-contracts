# to setup development environment
```yarn```

# to run test
```yarn test```

This will run the test with an in-memory ganache


# to submit gas report o google spreadsheet:
- download credentials.json from google api
- add it in contracts/
- run TSB_UPLOAD_GAS_REPORT=true yarn test
- if first time the script will ask to login on the web 
- you enter the code given
- done

