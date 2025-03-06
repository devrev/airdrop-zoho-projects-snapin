# Attachment Extraction phase

For the Attachment Extraction phase of the import process,
the Extractor has to upload each Attachment to DevRev’s S3 using the using S3Interact. 

After uploading an attachment or a batch of attachments, the Extractor also has to prepare and upload an SSOR attachment file.
It should contain the DevRev IDs of the extracted attachments, along with the parent and actor IDs from the External System.
This needs to be done because only the Extractor knows to what the attachment was attached in the External system.
The SSOR attachment file should then be sent just like any normal Artifact, but with the `ssor_attachment` item type.

## Examples

Here is an example of an SSOR attachment file:
```json
[
	{
		"id": {
			"external": "don:core:dvrv-us-1:devo/1:artifact/1" // The DON of the uploaded artifact
		},
		"parent_id": {
			"external": "12345", // ID of the parent in the source system
		},
		"actor_id": {
			"external": "123456", // ID of the uploader in the source system
		}
	},
	{
		"id": {
			"external": "don:core:dvrv-us-1:devo/1:artifact/2" // The DON of the uploaded artifact
		},
		"parent_id": {
			"external": "12344", // ID of the parent in the source system
		},
		"actor_id": {
			"external": "123457", // ID of the uploader in the source system
		}
	}
]
```
