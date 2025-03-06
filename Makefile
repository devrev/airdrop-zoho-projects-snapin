include .env

# export values in .env to be used in the shell scripts
export $(shell sed 's/=.*//' .env)

default:
	$(MAKE) build

deps:
	cd code && npm ci
.PHONY: deps

build: deps
	cd code && npm run build
.PHONY: build

package: build
	cd code && npm run package
	mv code/build.tar.gz .
.PHONY: package

auth:
# Check that ENV is a valid DevRev environment
ifeq ($(filter $(ENV),dev qa prod),)
    $(error ENV must be set to either dev, qa or prod)
endif
	./code/scripts/auth.sh 
.PHONY: auth

deploy: package
ifeq ($(ENV),)
	$(error ENV must be set to either dev, qa or prod)
endif
	./code/scripts/deploy.sh
.PHONY: deploy

# Removes the latest snap-in from the DevOrg. This is useful when you want to
# re-deploy the same snap-in to the same org.
uninstall:
	./code/scripts/cleanup.sh
.PHONY: uninstall
