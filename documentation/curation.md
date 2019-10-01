Asset Curation
=================

As mentioned in the Asset Smart contract document, we implement content curation as a “layer 2” solution. The goal being to promote quality content and avoid obscene, copies or other unacceptable content on our platform. 

There are 8 components
The Staking Smart contract
The Judgement Smart contract
The backend storing the bets message
The interface for curators
The interface for moderators
The interface for buyers
The Sandbox’s policy
The Asset’s license

The Staking Smart contract is simply a contract that put SAND in escrow that can be released in a given time window. Let's say, a user requesting withdrawal has to wait 8 days to get its SAND back. This gives enough time for curation judgement to happen.

The Judgement Smart contract is allowed to withdraw from the staking smart contract. It does so based on a judgement decision and the bets messages. The flow of Sand can only go to curators based on their signed messages or to Pixowl as a fee.

Whenever a creators mint a new Asset, it pays a fee. This act a a first deterrent for unacceptable content. The fee could either be burnt or redirected to the Judgement contract to reward curators.

When minting an asset, creators needs to provide a metadata stored on IPFS. Our marketplace offer such facility automatically via our backend. Creators are given an interface to different attributes and to agree with the policies

Then our backend will verify its existence, check that it adheres to the schema and contain a reference to our policy (implicitly agreeing with it). If so the Asset is added to our marketplace. It is also allowed to be played with on our game client

Now since it is not possible for our backend to automatically decide whether the asset is not infringing on someone else IP or if it is considered unacceptable by our policy (obscene, racist,...) we flag the Asset to our marketplace as needing review. We could either initially hide the Asset from potential buyer or let them know that such asset has not been approved yet by the community and that buying it is at its own risk.

Curators that staked Sand token in the Staking Smart contract can now bet on whether the Asset is deemed unacceptable or not. For that they simply sign a message. Our interface could be as simple as 2 buttons, one for approving, one for disapproving. 

The bet is actually only actualised if a judgement is ruled. If no judgement happen, the bet have no consequence for the curators. 

Nevertheless, our backend use the number of bets to decide whether the Asset should be filtered out of the marketplace. Indeed, since curators always run the risk of losing Sand to give out obviously wrong answer, we can expect the bet to reflect a true statement.

Now a judgement can happen at any time. For that, a set of moderators, employed by The Sandbox is reviewing a random set of submission. If they deemed one unacceptable, they submit their answer to the Judgement Smart contract that simply assign the result of the judgement. Curators can then claim their rewards.

Now it is possible that the moderators themselves take a wrong decision and an Asset that would look acceptable to the community might not be for a specific moderator.

To accommodate for that risk, anyone can submit a challenge via kleros.io to request a new judgement to be made independently of The Sandbox team.

The Sandbox would put some Sand at stake to cover for the potential curator/creator’s loss. 
