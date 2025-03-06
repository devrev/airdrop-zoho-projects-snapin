# Quick Start

1. Create a new repo from the ADaaS Template repo:
On [devrev/adaas-template](https://github.com/devrev/adaas-template) use the dropdown button `Use this template` and
then `Create a new repository`.
2. If you have not created a development organization on DevRev before, we suggest you create a dedicated
[DevOrg for development purposes](https://app.devrev.ai/) where you will be publishing your ADaaS Snap-in.
3. Install required tools and packages:
   - [devrev-cli](https://developer.devrev.ai/snapin-development/references/cli-install) (version 4.7 or higher)
   - [jq](https://stedolan.github.io/jq)
   - [golang](https://go.dev/doc/install)
   - [nodejs](https://nodejs.org/en/download/package-manager) (version 18.x.x+ or higher)
4. Copy `Makefile.variable.example` to `Makefile.variable` and fill in the required variables.
5. Configure a Keyring for the External System in the `manifest.yaml`.
See [Creating a Keyring](https://www.notion.so/Creating-a-Keyring-aa497671dc1b423fae70f7a0c14fba3a?pvs=21).
6. Deploy a draft version of your Snap-In to you DevOrg using `make deploy`.
7. Install the Snap-In in your DevRev DevOrg on the web by navigating to `Settings` -> `Snap-ins` -> `Install Snap-in`.
8. Define the `Connection`.
9. Create an `Import.`
