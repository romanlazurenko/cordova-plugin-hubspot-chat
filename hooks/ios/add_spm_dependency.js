#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

module.exports = function (context) {
  const projectRoot = context.opts.projectRoot;
  const platformPath = path.join(projectRoot, "platforms", "ios");

  if (!fs.existsSync(platformPath)) {
    console.log("[HubspotChat] iOS platform not found, skipping setup");
    return;
  }

  const projectName = getProjectName(projectRoot);
  
  // Get variables
  const variables = getPluginVariables(context, projectRoot);
  
  // Create Hubspot-Info.plist
  createHubSpotInfoPlist(platformPath, projectName, variables);
  
  // Add SPM dependency and plist to project
  addToXcodeProject(platformPath, projectName, variables);
};

function getPluginVariables(context, projectRoot) {
  let portalId = "";
  let hublet = "";
  let defaultChatFlow = "default";

  // Try to get from context
  if (context.opts && context.opts.plugin && context.opts.plugin.pluginInfo) {
    const prefs = context.opts.plugin.pluginInfo.getPreferences();
    if (prefs.HUBSPOT_PORTAL_ID) portalId = prefs.HUBSPOT_PORTAL_ID;
    if (prefs.HUBSPOT_HUBLET) hublet = prefs.HUBSPOT_HUBLET;
    if (prefs.HUBSPOT_HUB_ID && !hublet) hublet = prefs.HUBSPOT_HUB_ID;
    if (prefs.HUBSPOT_DEFAULT_CHAT_FLOW) defaultChatFlow = prefs.HUBSPOT_DEFAULT_CHAT_FLOW;
  }

  // Try fetch.json
  if (!portalId || !hublet) {
    const fetchJsonPath = path.join(projectRoot, "plugins", "fetch.json");
    if (fs.existsSync(fetchJsonPath)) {
      try {
        const fetchJson = JSON.parse(fs.readFileSync(fetchJsonPath, "utf8"));
        const pluginConfig = fetchJson["cordova-plugin-hubspot-chat"];
        if (pluginConfig && pluginConfig.variables) {
          if (pluginConfig.variables.HUBSPOT_PORTAL_ID && !portalId) {
            portalId = pluginConfig.variables.HUBSPOT_PORTAL_ID;
          }
          if (pluginConfig.variables.HUBSPOT_HUBLET && !hublet) {
            hublet = pluginConfig.variables.HUBSPOT_HUBLET;
          }
          if (pluginConfig.variables.HUBSPOT_HUB_ID && !hublet) {
            hublet = pluginConfig.variables.HUBSPOT_HUB_ID;
          }
          if (pluginConfig.variables.HUBSPOT_DEFAULT_CHAT_FLOW) {
            defaultChatFlow = pluginConfig.variables.HUBSPOT_DEFAULT_CHAT_FLOW;
          }
        }
      } catch (e) {
        console.log("[HubspotChat] Could not parse fetch.json");
      }
    }
  }

  // Try package.json cordova section
  if (!portalId || !hublet) {
    const packageJsonPath = path.join(projectRoot, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
        const pluginVars = packageJson.cordova?.plugins?.["cordova-plugin-hubspot-chat"];
        if (pluginVars) {
          if (pluginVars.HUBSPOT_PORTAL_ID && !portalId) portalId = pluginVars.HUBSPOT_PORTAL_ID;
          if (pluginVars.HUBSPOT_HUBLET && !hublet) hublet = pluginVars.HUBSPOT_HUBLET;
          if (pluginVars.HUBSPOT_HUB_ID && !hublet) hublet = pluginVars.HUBSPOT_HUB_ID;
          if (pluginVars.HUBSPOT_DEFAULT_CHAT_FLOW) defaultChatFlow = pluginVars.HUBSPOT_DEFAULT_CHAT_FLOW;
        }
      } catch (e) {
        console.log("[HubspotChat] Could not parse package.json");
      }
    }
  }

  // Try config.xml
  if (!portalId || !hublet) {
    const configXmlPath = path.join(projectRoot, "config.xml");
    if (fs.existsSync(configXmlPath)) {
      const configXml = fs.readFileSync(configXmlPath, "utf8");
      const portalIdMatch = configXml.match(/HUBSPOT_PORTAL_ID["\s]*value="([^"]+)"/);
      const hubletMatch = configXml.match(/HUBSPOT_HUBLET["\s]*value="([^"]+)"/);
      const hubIdMatch = configXml.match(/HUBSPOT_HUB_ID["\s]*value="([^"]+)"/);
      const chatFlowMatch = configXml.match(/HUBSPOT_DEFAULT_CHAT_FLOW["\s]*value="([^"]+)"/);

      if (portalIdMatch && !portalId) portalId = portalIdMatch[1];
      if (hubletMatch && !hublet) hublet = hubletMatch[1];
      if (hubIdMatch && !hublet) hublet = hubIdMatch[1];
      if (chatFlowMatch) defaultChatFlow = chatFlowMatch[1];
    }
  }

  if (!hublet || /^\d+$/.test(hublet)) {
    hublet = "eu1";
  }

  return { portalId, hublet, defaultChatFlow };
}

function createHubSpotInfoPlist(platformPath, projectName, variables) {
  const plistPath = path.join(platformPath, projectName, "Hubspot-Info.plist");

  if (!variables.portalId || !variables.hublet) {
    console.log("[HubspotChat] Warning: HUBSPOT_PORTAL_ID or HUBSPOT_HUBLET not set");
    return;
  }

  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>portalId</key>
    <string>${variables.portalId}</string>
    <key>hublet</key>
    <string>${variables.hublet}</string>
    <key>environment</key>
    <string>prod</string>
    <key>defaultChatFlow</key>
    <string>${variables.defaultChatFlow}</string>
</dict>
</plist>`;

  const exists = fs.existsSync(plistPath);
  fs.writeFileSync(plistPath, plistContent);
  console.log(`[HubspotChat] ${exists ? "Updated" : "Created"} Hubspot-Info.plist`);
  console.log(`[HubspotChat]   portalId: ${variables.portalId}`);
  console.log(`[HubspotChat]   hublet: ${variables.hublet}`);
  console.log(`[HubspotChat]   defaultChatFlow: ${variables.defaultChatFlow}`);
}

function addToXcodeProject(platformPath, projectName, variables) {
  const pbxprojPath = path.join(platformPath, `${projectName}.xcodeproj`, "project.pbxproj");

  if (!fs.existsSync(pbxprojPath)) {
    console.log("[HubspotChat] project.pbxproj not found");
    return;
  }

  let pbxproj = fs.readFileSync(pbxprojPath, "utf8");
  let modified = false;

  // Generate consistent UUIDs based on a seed so they're the same across runs
  const packageRefUUID = "HUBSPOT_SPM_PKG_REF_001";
  const packageProductUUID = "HUBSPOT_SPM_PROD_DEP01";
  const plistFileRefUUID = "HUBSPOT_PLIST_FILEREF1";
  const plistBuildFileUUID = "HUBSPOT_PLIST_BUILD01";

  // Add Hubspot-Info.plist to PBXFileReference section
  if (!pbxproj.includes("Hubspot-Info.plist")) {
    const fileRefEntry = `\t\t${plistFileRefUUID} /* Hubspot-Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = "Hubspot-Info.plist"; sourceTree = "<group>"; };\n`;
    
    pbxproj = pbxproj.replace(
      /(\/\* Begin PBXFileReference section \*\/\n)/,
      `$1${fileRefEntry}`
    );

    // Add to PBXBuildFile section
    const buildFileEntry = `\t\t${plistBuildFileUUID} /* Hubspot-Info.plist in Resources */ = {isa = PBXBuildFile; fileRef = ${plistFileRefUUID} /* Hubspot-Info.plist */; };\n`;
    
    pbxproj = pbxproj.replace(
      /(\/\* Begin PBXBuildFile section \*\/\n)/,
      `$1${buildFileEntry}`
    );

    // Add to main group (find the group that contains other files like Info.plist)
    pbxproj = pbxproj.replace(
      /(children\s*=\s*\([^)]*)(Info\.plist[^,]*,)/,
      `$1$2\n\t\t\t\t${plistFileRefUUID} /* Hubspot-Info.plist */,`
    );

    // Add to Resources build phase
    pbxproj = pbxproj.replace(
      /(\/\* Resources \*\/\s*=\s*\{[^}]*files\s*=\s*\()([^)]*\))/,
      `$1\n\t\t\t\t${plistBuildFileUUID} /* Hubspot-Info.plist in Resources */,$2`
    );

    modified = true;
    console.log("[HubspotChat] Added Hubspot-Info.plist to Xcode project");
  }

  // Add Swift Package Manager dependency
  const originalPbxproj = pbxproj;
  
  console.log("[HubspotChat] Adding HubSpot SDK Swift Package Manager dependency...");

  // Add XCRemoteSwiftPackageReference section if not exists
  if (!pbxproj.includes("/* Begin XCRemoteSwiftPackageReference section */")) {
    const remotePackageSection = `/* Begin XCRemoteSwiftPackageReference section */
\t\t${packageRefUUID} /* XCRemoteSwiftPackageReference "mobile-chat-sdk-ios" */ = {
\t\t\tisa = XCRemoteSwiftPackageReference;
\t\t\trepositoryURL = "https://github.com/HubSpot/mobile-chat-sdk-ios";
\t\t\trequirement = {
\t\t\t\tkind = upToNextMajorVersion;
\t\t\t\tminimumVersion = 1.0.0;
\t\t\t};
\t\t};
/* End XCRemoteSwiftPackageReference section */

`;
    pbxproj = pbxproj.replace(/([\s\S]*)(\/\* Begin XCConfigurationList section \*\/)/, "$1" + remotePackageSection + "$2");
    console.log("[HubspotChat] Added XCRemoteSwiftPackageReference section");
  }

  // Add XCSwiftPackageProductDependency section if not exists
  if (!pbxproj.includes("/* Begin XCSwiftPackageProductDependency section */")) {
    const productDepSection = `/* Begin XCSwiftPackageProductDependency section */
\t\t${packageProductUUID} /* HubspotMobileSDK */ = {
\t\t\tisa = XCSwiftPackageProductDependency;
\t\t\tpackage = ${packageRefUUID} /* XCRemoteSwiftPackageReference "mobile-chat-sdk-ios" */;
\t\t\tproductName = HubspotMobileSDK;
\t\t};
/* End XCSwiftPackageProductDependency section */

`;
    pbxproj = pbxproj.replace(/([\s\S]*)(\/\* Begin XCConfigurationList section \*\/)/, "$1" + productDepSection + "$2");
    console.log("[HubspotChat] Added XCSwiftPackageProductDependency section");
  }

  // Add to packageReferences in PBXProject section
  const packageRefEntry = `${packageRefUUID} /* XCRemoteSwiftPackageReference "mobile-chat-sdk-ios" */`;
  const hasPackageRef = /packageReferences\s*=\s*\([^)]*HUBSPOT_SPM_PKG_REF_001[^)]*\)/.test(pbxproj);
  if (!hasPackageRef) {
    let beforeReplace = pbxproj;
    // Try to add to existing empty array
    pbxproj = pbxproj.replace(
      /(packageReferences\s*=\s*\()(\n\s*\);)/g,
      `$1\n\t\t\t\t${packageRefEntry},\n\t\t\t);`
    );
    if (pbxproj === beforeReplace) {
      // Array doesn't exist, add it after mainGroup in PBXProject section
      pbxproj = pbxproj.replace(
        /(mainGroup\s*=\s*[A-F0-9]+[^;]*;)/,
        `$1\n\t\t\tpackageReferences = (\n\t\t\t\t${packageRefEntry},\n\t\t\t);`
      );
    }
    if (pbxproj !== beforeReplace) {
      console.log("[HubspotChat] Added packageReferences entry");
    }
  }

  // Add to packageProductDependencies in PBXNativeTarget section
  const packageProdEntry = `${packageProductUUID} /* HubspotMobileSDK */`;
  const hasPackageProd = /packageProductDependencies\s*=\s*\([^)]*HUBSPOT_SPM_PROD_DEP01[^)]*\)/.test(pbxproj);
  if (!hasPackageProd) {
    let beforeReplace = pbxproj;
    // Try to add to existing empty array
    pbxproj = pbxproj.replace(
      /(packageProductDependencies\s*=\s*\()(\n\s*\);)/g,
      `$1\n\t\t\t\t${packageProdEntry},\n\t\t\t);`
    );
    if (pbxproj === beforeReplace) {
      // Array doesn't exist, add it after buildPhases in PBXNativeTarget for application
      pbxproj = pbxproj.replace(
        /(isa\s*=\s*PBXNativeTarget;[\s\S]*?buildPhases\s*=\s*\([^)]+\);)/,
        `$1\n\t\t\tpackageProductDependencies = (\n\t\t\t\t${packageProdEntry},\n\t\t\t);`
      );
    }
    if (pbxproj !== beforeReplace) {
      console.log("[HubspotChat] Added packageProductDependencies entry");
    }
  }

  // Write if changed
  if (pbxproj !== originalPbxproj) {
    fs.writeFileSync(pbxprojPath, pbxproj);
    console.log("[HubspotChat] Xcode project updated successfully");
  } else {
    console.log("[HubspotChat] No changes needed to Xcode project");
  }
}

function getProjectName(projectRoot) {
  const configPath = path.join(projectRoot, "config.xml");
  if (fs.existsSync(configPath)) {
    const config = fs.readFileSync(configPath, "utf8");
    const nameMatch = config.match(/<name>([^<]+)<\/name>/);
    if (nameMatch) {
      return nameMatch[1];
    }
  }
  return "App";
}
