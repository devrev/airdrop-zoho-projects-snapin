# Extract External Sync Units Phase

In the External Sync Unit extraction phase, the Extractor is expected to get the list of projects, repositories, etc.
(whatever the equivalent of those is called in the External System)
that it can extract with the provided credentials and send it to Airdrop in its response.

The most important structure in the message is the list of External Sync Units (event_data.external_sync_units in JSON),
which contains the following fields:
- ID: This is the unique identifier in the External System
- Name: This is the human-readable name in the External System
- Description: A short description if the External System provides it
- Item count (item_count): The number of items (issues, tickets, comments, etc.) in the External System,
if it can be obtained in a very lightweight manner, such as by calling a special API endpoint.
If there is no such way to get it, i.e., the items would need to be extracted to count them,
then the item count should be `-1`, to avoid blocking the import with long-running queries.

Example:
```json
[
  {
    "id": "a-microservice-repository",
    "name": "A Microservice Repository",
    "description": "Our greatest microservice repo",
    "item_count": 232
  }
]
```
