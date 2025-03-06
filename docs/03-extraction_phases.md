# Extraction Phases

Airdrop extractions are done in phases.
Phases follow sequentially, and each can consist of one or more invocations of the Worker.

A Worker has the responsibility of maintaining its own state that persists between phases in a Sync Run,
as well as between Sync Runs.

```mermaid
---
title: Extraction Phases
---
sequenceDiagram
  actor user as UI
  participant gw as Gateway
  participant ad as Airdrop components
  participant ee as External Extractor

	note over gw,ad: Extract External Sync Units
	user ->> gw: Select import connection
	gw ->> ad: Start External Sync Unit extraction
	ad ->> ee: Start External Sync Unit extraction
	ee -->> gw: List of External Sync Units
	gw ->> ad: List of External Sync Units
	ad ->> gw: List of External Sync Units
	gw -->> user: Show available External Sync Units
	
	
	note over gw,ad: Extract Metadata
	ad ->> ee: Start Metadata extraction
	ee -->> gw: List of extracted metadata artifacts
	gw ->> ad: List of extracted metadata artifacts

	note over gw,ad: Extract data
	ad ->> ee: Start data extraction
	ee -->> gw: List of extracted data artifacts
	gw ->> ad: List of extracted data artifacts

	note over ad: Transform and import data into DevRev

	note over gw,ad: Extract attachments
	ad ->> ee: Start attachment extraction
	ee -->> gw: List of extracted attachments
	gw ->> ad: List of extracted attachments

	ad -->> gw: Finished import
	gw -->> user: Show finished import and report

	note over gw,ad: Delete data
	user ->> gw: Delete import
	gw ->> ad: Delete import
	ad ->> ee: Delete data
	ee -->> gw: Finished deleting data
	gw ->> ad: Finished deleting data

	note over gw,ad: Delete attachments
	ad ->> ee: Delete attachments
	ee -->> gw: Finished deleting attachments
	gw ->> ad: Finished deleting attachments
	note over ad: Deletes internal data
	ad -->> gw: Finished deleting import
	gw -->> user: Import deleted
```

An Initial Import consists of the following phases:
- External Sync Units extraction,
- Metadata extraction,
- Data extraction,
- Attachments extraction.

A 1-way Sync consists of the following phases:
- Metadata extraction,
- Data extraction,
- Attachments extraction.

A 1-way Sync extracts only the domain objects updated and/or created since the previous successful Sync Run.

A Deletion Sync consists of the following phases:
- Delete data,
- Delete attachments.

## External Sync Unit Extraction

External Sync Unit Extraction is an extraction phase, executed only during the Initial Import.
It extracts External Sync Units available in the External System,
so that the end user can choose which External Sync Unit should be airdropped.  

Airdrop initiates the External Sync Unit Extraction phase by starting the Worker with a message with eventType:
`EXTRACTION_EXTERNAL_SYNC_UNITS_START` to start the External Sync Unit Extraction.

The Worker must respond to Airdrop with a message with eventType `EXTRACTION_EXTERNAL_SYNC_UNITS_DONE`
with a list of External Sync Units as a payload, or `EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR` in case of an error.

## Metadata Extraction

Airdrop initiates the Metadata Extraction by starting the Worker with a message with eventType: `EXTRACTION_METADATA_START`.

During the Metadata Extraction phase,
the Worker extracts relevant metadata from an External System
to prepare and upload the Initial Domain Mapping to DevRev.

The Worker must respond to Airdrop with a message with eventType `EXTRACTION_METADATA_DONE` when done,
or `EXTRACTION_METADATA_ERROR` in case of an error.

## Data Extraction

Airdrop initiates Data Extraction by starting the Worker with a message with eventType `EXTRACTION_DATA_START`
when transitioning to the Data Extraction phase.

During the Data Extraction phase, the Worker extracts data from an External System,
prepares batches of data and uploads them in the form of Artifacts to DevRev.

The Worker must respond to Airdrop with a message with eventType `EXTRACTION_DATA_PROGRESS`,
together with an optional progress estimate and relevant Artifacts
when it extracts some data and the maximum Worker runtime (12 minutes) has been reached. 

The Worker must respond to Airdrop with a message with eventType `EXTRACTION_DATA_DELAY` and specifying back-off time
when the extraction has been rate-limited by the External System and back-off is required.

In both cases, Airdrop starts the Worker with a message with eventType `EXTRACTION_DATA_CONTINUE`.
The restarting is immediate (in case of `EXTRACTION_DATA_PROGRESS`) or delayed (in case of `EXTRACTION_DATA_DELAY`).

Once the Data Extraction is done, the Worker must respond to Airdrop with a message with eventType `EXTRACTION_DATA_DONE`.

If Data Extraction failed in any moment of extraction, the Worker must respond to Airdrop with a message with eventType `EXTRACTION_DATA_ERROR`.

## Attachment Extraction

Airdrop initiates the Attachment Extraction by starting the Worker with a message with eventType `EXTRACTION_ATTACHMENTS_START`
when transitioning to the Data Extraction phase.

During the Attachment Extraction phase,
the Worker extracts attachments from the External System and uploads them as Artifacts to DevRev.

The Worker must respond to Airdrop with a message with eventType `EXTRACTION_ATTACHMENTS_PROGRESS` together with an optional progress estimate and relevant Artifacts
when it extracts some data and the maximum Worker runtime (12 minutes) has been reached.

The Worker must respond to Airdrop with a message with eventType `EXTRACTION_ATTACHMENTS_DELAY` and specify a back-off time
when the extraction has been rate-limited by the External System and back-off is required.

In both cases, Airdrop starts the Worker with a message with eventType `EXTRACTION_ATTACHMENTS_CONTINUE`.
The restart is immediate (in case of `EXTRACTION_ATTACHMENTS_PROGRESS`) or delayed
(in case of `EXTRACTION_ATTACHMENTS_DELAY`).

Once the Attachment Extraction phase is done, the Worker must respond to Airdrop with a message with eventType `EXTRACTION_ATTACHMENTS_DONE`.

If Attachment Extraction failed, the Worker must respond to Airdrop with a message with eventType `EXTRACTION_ATTACHMENTS_ERROR`.

## Delete Data

Airdrop initiates the Data Delete phase when the Sync is deleted from DevRev.
It is started by sending the Worker a message with eventType: `EXTRACTION_DATA_DELETE`.

During the Data Delete phase, the Worker may clean up its state or other side effects in the third party systems.
In the most common extraction use cases, there is nothing to do and Workers may reply with the completion message.

The Worker must respond to Airdrop with a message with eventType `EXTRACTION_DATA_DELETE_DONE` when done or `EXTRACTION_DATA_DELETE_ERROR` in case of an error.

## Delete Attachments

Airdrop initiates the Attachments Delete phase when the Sync is deleted from DevRev.
It is started by sending the Worker a message with eventType: `EXTRACTION_ATTACHMENTS_DELETE`.

During the Data Delete phase, the Worker may clean up its state or other side effects in the third party systems.
In the most common extraction use cases, there is nothing to do and Workers may reply with the completion message.

The Worker must respond to Airdrop with a message with eventType `EXTRACTION_ATTACHMENTS_DELETE_DONE` when done,
or `EXTRACTION_ATTACHMENTS_DELETE_ERROR` in case of an error.
