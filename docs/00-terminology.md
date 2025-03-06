# Terminology

## External System

An External System refers to any system (data source, CRM, etc.) that is not DevRev, e.g., Jira, Zendesk, HubSpot, etc.
The External System ID is the identifier of an organization in the External System.
For GitHub, this would be the organization name, i.e. `devrev` in `github.com/devrev`.
For Jira, this would be the organization name in the Jira domain name, i.e. `devrev` in `devrev.atlassian.net`.

## Airdrop

Airdrop is DevRev’s solution to migrate data.
It allows our customers to bring in their existing data from [External Systems](#external-system),
sync data back to External Systems, and keep data in sync between DevRev and the External Systems.
You can read more about Airdrop in the [general documentation](https://docs.devrev.ai/import#airdrop-features).

## Snap-In

A Snap-In is a component that extends DevRev’s functionality.
It provides a base platform for creating [ADaaS Workers](#worker) ([Extractors](#extractor) and [Loaders](#loader)).
You can read more about Snap-Ins in the [developer documentation](https://developer.devrev.ai/snapin-development/concepts#snap-in).

## ADaaS

Airdrop-as-a-Service (ADaaS) gives [Snap-In](#snap-in) developers the ability to integrate with DevRev’s [Airdrop](#airdrop) functionality.
It enables developers to create [Extractors](#extractor) and [Loaders](#loader) for various [External Systems](#external-system).

## Extractor

An Extractor is an [ADaaS](#adaas) [Snap-In](#snap-in) responsible for extracting data from an [External System](#external-system), such as Jira, Zendesk, HubSpot, etc.
It uses a standardized communication protocol for talking to [Airdrop](#airdrop) and a standardized data structure for all the files it extracts and processes,
so that they can be seamlessly imported into DevRev.

## Loader

A Loader is an [ADaaS](#adaas) [Snap-in](#snap-in) that is responsible for loading data from [Airdrop](#airdrop) into an [External System](#external-system).
It is very similar to an [Extractor](#extractor), but it does the reverse job.

## Worker

An [Extractor](#extractor) or [Loader](#loader).

## Forward Sync

A Forward Sync is a sync from an [External System](#external-system) to DevRev.
An [Extractor](#extractor) is used to extract the created and/or updated data from the [External System](#external-system).

## Reverse Sync

A Reverse Sync is a sync from DevRev to an [External System](#external-system).
A [Loader](#loader) is used to load the created and/or updated data to the [External System](#external-system).

## Initial Import

An Initial Import is the first import of data from the [External System](#external-system) to DevRev.
It is triggered manually by the end user in DevRev's Imports UI.

## 1-way Sync

A 1-way Sync refers to an extraction, done after an [Initial Import](#initial-import) has been run.
An [Extractor](#extractor) extracts data that was created and/or updated in the [External System](#external-system)
after the start of the latest successful [Forward Sync](#forward-sync),
including any changes that occurred during the [Forward Sync](#forward-sync), but were not picked up by it.

An [Extractor](#extractor) must consult its state
to get information on when the last successful [Forward Sync](#forward-sync) started.

## Sync Unit

A Sync Unit is the import/sync of a project, repository, etc., that is happening between DevRev and an [External System](#external-system).
The Sync Unit ID is the unique identifier of the import/sync in DevRev.

## External Sync Unit

An External Sync Unit refers to a single unit in the [External System](#external-system) that we are airdropping to DevRev.
In some systems, this is a project, in some it is a repository, in support systems this External Sync Unit could be called a brand or an organization.
What a unit of data is called, and what it represents depends on the [External System](#external-system)'s domain model.
It usually combines contacts, users, work-like items, and comments into a unit of domain objects.

Some [External Systems](#external-system) may offer a single unit in their free plans,
while their enterprise plans may offer their clients to operate many separate units.

The External Sync Unit ID is the identifier of the project, repository, etc. in the [External System](#external-system).
For GitHub, this would be the repository, i.e. `cli` in `github.com/devrev/cli`.

## Sync Run

A Sync Run is one instance of an [Initial Import](#initial-import) any type of sync.
If you do an import from Jira to DevRev, that import will be one Sync Run.
If you then decide to do a sync, that would be another Sync Run.
Each Sync Run has its own identifier called Run ID.

Each Sync Run contains multiple States and multiple invocations of the [Worker](#worker).

## Keyring

A Keyring is a collection of authentication information for an [External System](#external-system).
This includes the key (e.g., a PAT token or API key), its type, the organization ID for which a key is valid,
and in some cases the organization name.
A Keyring is used by a [Worker](#worker) to authenticate to the [External System](#external-system) in API calls.

## Recipe

A Recipe is a document that contains mappings between [External System](#external-system) domain entities and DevRev
domain entities and provides transformations between them.

A Recipe is produced by a service called Recipe Manager.
It constructs the Recipe based on the following inputs:
- [Initial Domain Mappings](#initial-domain-mapping),
- results of the schema discovery performed on raw data,
- end-user inputs provided in the Mapping Screen during a [Sync Run](#sync-run).

## Initial Domain Mapping

An Initial Domain Mapping is a JSON document that provides a list of possible mappings between the
[External System](#external-system)'s domain model and the DevRev domain model.

It serves as one of the inputs to the Recipe Manager to produce a working [Recipe](#recipe).

It can, for instance, specify multiple possible mappings for [External System](#external-system)’s domain entities
(e.g., Problems can be mapped to DevRev Tickets or to DevRev Issues).
In these cases, the end user decides the final transformation.

## Artifact

An Artifact refers to any file that a [Worker](#worker) uploads to DevRev,
most commonly this is data extracted from an [External System](#external-system).

It is important to note the distinction between Artifacts and Attachments (seen in later sections).
An Attachment refers to a file that is attached to an object in the [External System](#external-system),
such as an image, that is attached to a Comment.
When calling an [External System](#external-system)’s API, a list of Comments could be returned.
To send this list of Comments to [Airdrop](#airdrop), the [Worker](#worker) would need to upload it as a file.
This file is referred to as an Artifact.

## S3Interact

S3Interact is a service that provides a set of APIs to interact with AWS S3 through the DevRev API.
It is used to upload and download attachments.
