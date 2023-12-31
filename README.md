## Test smart contract
Run `yarn test-smart-inscription-factory` to test `SmartInscriptionFactory.sol` and `SmartInscription721.sol`.

> Note: remove `/migrations/1_factory.js` or change file name before test.

## Deploy to testnet and mainnet
Run `mv .env_example .env` and config `.env`:
```
RPC_URL=
CHAIN_ID=
PRI_KEY=
```

Run `truffle migrate --network mumbai -f 1 --to 1` to deploy `SmartInscriptionFactory.sol`. 

Change `--network` if deploy to other chain.

## Config and deploy theGraph
Open `subgraph.yaml` under project `subgraph`. Update `dataSource -> kind -> source -> address` and `startBlock`. If the ABI of contract is changed, should also update the files in `/abis`.

Then run:
```
graph codegen && graph build
graph deploy --studio smart_inscription
```

Open https://thegraph.com/studio/subgraph/smart_inscription/playground to confirm the new version of `subgraph` is deployed.

## Run script to deploy a frc-721

Open `/scripts/1_test_factory.js`, update `contractAddress` with the deployed contract address.

Run `node scripts/1_test_factory.js` to deploy 1st `frc-721`.

Go the `theGraph` playgroud, input the query as below:
```
{
  deploys(first: 5) {
    id
    inscriptionId
    tick
    max
    transactionHash
    inscriptionAddress
    globalId
    blockTimestamp
    blockNumber
  }
  mints(first: 5) {
    id
    inscriptionId
    tick
    max
    blockTimestamp
    globalId
    inscriptionAddress
    tokenId
    totalSupply
    transactionHash
  }
}
```

After running the query, will get:
```
{
  "data": {
    "deploys": [
      {
        "id": "0x71b8b2a9569004dedba39fec449039440dcfc8f27e72baa838a1ed6b2cc0050921000000",
        "inscriptionId": "2",
        "tick": "aaaa",
        "max": "21000",
        "transactionHash": "0x71b8b2a9569004dedba39fec449039440dcfc8f27e72baa838a1ed6b2cc00509",
        "inscriptionAddress": "0xf2df6f7ac10791282e97662851c9d3dc5c5fe299",
        "globalId": "2",
        "blockTimestamp": "1702204057",
        "blockNumber": "43402677"
      }
    ],
    "mints": []
  }
}
```

The inscription contract address of deployed `frc-721` is: `0xf2df6f7ac10791282e97662851c9d3dc5c5fe299`

## Run script to mint frc-721
Open the `/scripts/1_test_factory.js` again and update the address in function `mint` to `mint("0xf2df6f7ac10791282e97662851c9d3dc5c5fe299");`

Run `node scripts/1_test_factory.js` to mint `frc-721`

> Note: the freeze time is 10 minutes, you can not mint again in 10 minutes after mint.

After mint, check theGraph again, you will find the event `Mint` has been recorded.
```
"mints": [
      {
        "id": "0x61472f1d00eb8c5b3ac7f3d5bf3511d8760501306f5a39be8b517896c9299bbb1a000000",
        "inscriptionId": "2",
        "tick": "aaaa",
        "max": "21000",
        "blockTimestamp": "1702204445",
        "globalId": "3",
        "inscriptionAddress": "0xf2df6f7ac10791282e97662851c9d3dc5c5fe299",
        "tokenId": "1",
        "totalSupply": "1",
        "transactionHash": "0x61472f1d00eb8c5b3ac7f3d5bf3511d8760501306f5a39be8b517896c9299bbb"
      }
    ]
```

## Update baseUri
When the NFT marketplaces or wallet such as `opensea.io` get the information of `frc-721`, it will fetch the data of tokenURI. The `baseURI` is very important to let the marketplace understand where to get.

```
{baseUri}/api/uri?ins={contract_address}&id={token_id}
```

After setting `.htaccess`, the tokenURI can be access by
```
{baseUri}/api/uri{contract_address}/{token_id}
```