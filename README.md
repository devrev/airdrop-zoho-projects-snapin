# Airdrop Zoho Projects Snapin

## Repository owners

| Repository Owner | Team Leader |
| ---------------- | ----------- |
| [NithiManivannan05](https://github.com/NithiManivannan05)          |             |

## Prerequisites

1\. Install [Go](https://go.dev/doc/install), [jq](https://jqlang.github.io/jq/download/) and [Node.js](https://nodejs.org/en/download/package-manager).

2\. Install [DevRev CLI](https://github.com/devrev/devrev-cli) by running the following command:

```bash
go install github.com/devrev/devrev-cli/devrev@main
```

## Configuration

1\. Generate a Github PAT (Personal Access Token) with `read:packages` permissions from [this link](https://github.com/settings/tokens) by following steps below:

- Click on `Generate new token (classic)`.

- Provide a meaningful `Note`, select an appropriate `Expiration`, and assign the `read:packages` scope.

- Click `Generate token` and **save the generated token in a secure location**.

- Click on `Configure SSO` and then on the `Authorize` button next to `devrev` to authorize the token for the DevRev organization.

2\. Add GitHub PAT to DevRev as a Snap-in secret:

- Open the DevRev org where you will perform an import.
- Add the GitHub PAT as a Snap-in secret (`Settings` -> `Imports` -> `Connections` -> `+ Connection` -> `Snap-in Secret`).
- Set the Connection Name to `github_access_token` and populate the Secret field with the GitHub PAT you generated.

## Build, Deploy and Run

1\. Clone Repository:

- Either clone this repository or create a new repository from it by clicking the "Use this template" button above.
- Set the desired repository name for your own copy (e.g., `airdrop-<external system>-snapin`).

2\. Open the project in your IDE and set up project environment variables, by following this steps:

- Rename `.env.example` to `.env`.
- In `.env` set the environment (`dev`, `qa`, or `prod`), the DevOrg slug of your organization, and your email.
- Enter the Github PAT generated in Step 2.

3\. Update `manifest.yaml`:

- Modify the `allowed_connection_types` field in the `imports` section to match your Snap-in's connection type.

NOTE: The current manifest demonstrates usage with a dynamic keyring (Basic Freshdesk Connection) as an example. If you're testing with basic Freshdesk dynamic keyring, you can leave it as is. Otherwise, update this field with the appropriate connection type configuration.

4\. Build the Snap-in using the following command:

```bash
make build
```

5\. Deploy the Snap-in to the DevOrg:

```bash
make deploy
```

NOTE: This process may take some time. Command authenticates you to the org using the DevRev CLI, prompts you to select the keyring where you saved GitHub PAT and creates a Snap-in package, its Snap-in version, and finally the Snap-in draft.

6\. After the Snap-in draft is created, install the Snap-in in the DevRev UI (`Settings` -> `Snap-ins` -> `Install snap-in`).

7\. Start the import (`Imports` -> `Start import` -> `<your Snap-in>`).

## Common Pitfalls

#### Q: `Conflict` error after the `Creating snap-in package...` output during `make deploy`.

    A: Snap-in package with the same slug already exists. Override the `SNAP_IN_SLUG` variable by explicitly updating the variable in `scripts/vars.sh`.

#### Q: Snap-in version `build/deployment failed` after the `Waiting for snap-in version to be ready...` message

    A: The snap-in version could not be built. Check the logs by running the DevRev CLI command `devrev snap_in_package logs`. For prettier UI, pipe the output to `jq`

#### Q: `github_access_token` not found after `Creating snap-in version...`

    A: There exists no keyring named `github_access_token` in the DevOrg. Either create one through the UI or choose a different organization.

#### Q: `npm ERR! E401` or `npm ERR! E403` in build logs. `build_failed` status after `Creating snap-in version...`.

    A: E401 is returned during snap-in version build phase if the authentication token  (in this case, github_access_token) is incorrect.

       E403 is returned when the token is correct but it does not have permission to access the resource(in this case, packages). Ensure that the token has `read:packages` scope and SSO has been configured for the organisation.

       In both cases, delete the failed snap-in version, check the tokens and rebuild again.

## Documentation

1. [Terminology](docs/00-terminology)
2. [ADaaS Overview](docs/01-adaas_overview)
3. [Quick Start](docs/02-quick_start)
4. [Extraction Phases](docs/03-extraction_phases)
5. [Creating a Keyring](docs/04-creating_a_keyring)
6. [Extracting External Sync Units](docs/05-extracting_external_sync_units)
7. [Extracting Metadata](docs/06-extracting_metadata)
8. [Extracting Data](docs/07-extracting_data)
9. [Extracting Attachments](docs/08-extracting_attachments)
10. [Observability](docs/09-observability)
