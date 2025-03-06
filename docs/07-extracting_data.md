# Data Extraction Phase

In the data extraction phase, the Extractor is expected to call the External System’s APIs
to retrieve all the items that were updated since the start of the last extraction.
If there was no previous extraction (the current run is an Initial Import), then all the items should be extracted.
The Extractor should remember at what time it started each extraction,
so that it can extract only items created and/or updated since this date in the next extraction run.
The reason for remembering it at the start of the extraction, and not at the end, is to allow some overlap
in case the items are updated during extraction (which happens very often in bigger organizations).

Each batch of extracted items (the recommended batch size is 2000-5000 items) must be formatted in JSONL
(JSON Lines format), gzipped, and submitted as an Artifact to S3Interact (with tooling from `@devrev/adaas-sdk`).

Each Artifact is submitted with an `item_type`, defining a separate domain object from the External System.
Item types defined when uploading extracted data must match those in the Initial Domain Mapping Artifact.
