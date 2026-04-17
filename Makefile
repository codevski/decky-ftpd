.PHONY: build zip deploy clean

PLUGIN_NAME = decky-ftpd

-include .env
export

build:
	pnpm build

zip: build
	rm -rf $(PLUGIN_NAME)-dist $(PLUGIN_NAME).zip
	mkdir -p $(PLUGIN_NAME)-dist/$(PLUGIN_NAME)
	cp main.py plugin.json package.json $(PLUGIN_NAME)-dist/$(PLUGIN_NAME)/
	cp -r dist $(PLUGIN_NAME)-dist/$(PLUGIN_NAME)/dist
	cp -r py_modules $(PLUGIN_NAME)-dist/$(PLUGIN_NAME)/py_modules
	cd $(PLUGIN_NAME)-dist && zip -r ../$(PLUGIN_NAME).zip $(PLUGIN_NAME)/

deploy: zip
	@if [ -z "$(DECK_IP)" ]; then echo "Error: DECK_IP not set. Add it to .env or run: make deploy DECK_IP=x.x.x.x"; exit 1; fi
	rsync -av $(PLUGIN_NAME).zip deck@$(DECK_IP):~/

clean:
	rm -rf dist $(PLUGIN_NAME)-dist $(PLUGIN_NAME).zip
