#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

module.exports = function (context) {
  const projectRoot = context.opts.projectRoot;
  const platformPath = path.join(projectRoot, "platforms", "android");

  if (!fs.existsSync(platformPath)) {
    console.log(
      "[HubspotChat] Android platform not found, skipping config setup"
    );
    return;
  }

  // Get variables from plugin
  let portalId = "";
  let hubId = "";
  let defaultChatFlow = "support";

  // Check fetch.json for variables
  const fetchJsonPath = path.join(projectRoot, "plugins", "fetch.json");
  if (fs.existsSync(fetchJsonPath)) {
    try {
      const fetchJson = JSON.parse(fs.readFileSync(fetchJsonPath, "utf8"));
      const pluginConfig = fetchJson["cordova-plugin-hubspot-chat"];
      if (pluginConfig && pluginConfig.variables) {
        if (pluginConfig.variables.HUBSPOT_PORTAL_ID) {
          portalId = pluginConfig.variables.HUBSPOT_PORTAL_ID;
        }
        if (pluginConfig.variables.HUBSPOT_HUB_ID) {
          hubId = pluginConfig.variables.HUBSPOT_HUB_ID;
        }
        if (pluginConfig.variables.HUBSPOT_DEFAULT_CHAT_FLOW) {
          defaultChatFlow = pluginConfig.variables.HUBSPOT_DEFAULT_CHAT_FLOW;
        }
      }
    } catch (e) {
      console.log("[HubspotChat] Could not parse fetch.json: " + e.message);
    }
  }

  // Also try config.xml
  if (!portalId || !hubId) {
    const configXmlPath = path.join(projectRoot, "config.xml");
    if (fs.existsSync(configXmlPath)) {
      const configXml = fs.readFileSync(configXmlPath, "utf8");

      const portalIdMatch = configXml.match(
        /HUBSPOT_PORTAL_ID["\s]*value="([^"]+)"/
      );
      const hubIdMatch = configXml.match(/HUBSPOT_HUB_ID["\s]*value="([^"]+)"/);
      const chatFlowMatch = configXml.match(
        /HUBSPOT_DEFAULT_CHAT_FLOW["\s]*value="([^"]+)"/
      );

      if (portalIdMatch && !portalId) portalId = portalIdMatch[1];
      if (hubIdMatch && !hubId) hubId = hubIdMatch[1];
      if (chatFlowMatch) defaultChatFlow = chatFlowMatch[1];
    }
  }

  if (!portalId || !hubId) {
    console.log(
      "[HubspotChat] Warning: HUBSPOT_PORTAL_ID or HUBSPOT_HUB_ID not set"
    );
    return;
  }

  // Create hubspot-info.json in assets folder
  const assetsPath = path.join(platformPath, "app", "src", "main", "assets");

  if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath, { recursive: true });
  }

  const hubspotConfig = {
    portalId: portalId,
    hubId: hubId,
    environment: "prod",
    defaultChatFlow: defaultChatFlow,
  };

  const configFilePath = path.join(assetsPath, "hubspot-info.json");
  fs.writeFileSync(configFilePath, JSON.stringify(hubspotConfig, null, 2));

  console.log("[HubspotChat] Created hubspot-info.json at: " + configFilePath);
};
