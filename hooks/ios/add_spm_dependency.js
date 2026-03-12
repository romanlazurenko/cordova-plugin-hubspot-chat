#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

module.exports = function (context) {
  const projectRoot = context.opts.projectRoot;
  const platformPath = path.join(projectRoot, "platforms", "ios");

  if (!fs.existsSync(platformPath)) {
    console.log("[HubspotChat] iOS platform not found, skipping SPM setup");
    return;
  }

  const projectName = getProjectName(projectRoot);
  const pbxprojPath = path.join(
    platformPath,
    `${projectName}.xcodeproj`,
    "project.pbxproj"
  );

  if (!fs.existsSync(pbxprojPath)) {
    console.log("[HubspotChat] project.pbxproj not found at: " + pbxprojPath);
    return;
  }

  console.log("[HubspotChat] Adding HubSpot SDK Swift Package dependency...");

  let pbxproj = fs.readFileSync(pbxprojPath, "utf8");

  // Check if already added
  if (pbxproj.includes("mobile-chat-sdk-ios")) {
    console.log("[HubspotChat] HubSpot SDK already added to project");
    return;
  }

  // Generate UUIDs for the package reference
  const packageRefUUID = generateUUID();
  const packageProductUUID = generateUUID();

  // Find the project section to add package references
  const projectSectionMatch = pbxproj.match(
    /(\/\* Begin PBXProject section \*\/[\s\S]*?)(mainGroup\s*=\s*[A-F0-9]+;)/
  );

  if (!projectSectionMatch) {
    console.log("[HubspotChat] Could not find PBXProject section");
    return;
  }

  // Add XCRemoteSwiftPackageReference section if not exists
  if (!pbxproj.includes("XCRemoteSwiftPackageReference section")) {
    const remotePackageSection = `/* Begin XCRemoteSwiftPackageReference section */
		${packageRefUUID} /* XCRemoteSwiftPackageReference "mobile-chat-sdk-ios" */ = {
			isa = XCRemoteSwiftPackageReference;
			repositoryURL = "https://github.com/HubSpot/mobile-chat-sdk-ios";
			requirement = {
				kind = upToNextMajorVersion;
				minimumVersion = 1.0.0;
			};
		};
/* End XCRemoteSwiftPackageReference section */

`;

    // Insert before root object
    pbxproj = pbxproj.replace(
      /([\s\S]*)(rootObject\s*=)/,
      "$1" + remotePackageSection + "$2"
    );
  }

  // Add XCSwiftPackageProductDependency section if not exists
  if (!pbxproj.includes("XCSwiftPackageProductDependency section")) {
    const productDepSection = `/* Begin XCSwiftPackageProductDependency section */
		${packageProductUUID} /* HubspotMobileSDK */ = {
			isa = XCSwiftPackageProductDependency;
			package = ${packageRefUUID} /* XCRemoteSwiftPackageReference "mobile-chat-sdk-ios" */;
			productName = HubspotMobileSDK;
		};
/* End XCSwiftPackageProductDependency section */

`;

    pbxproj = pbxproj.replace(
      /([\s\S]*)(rootObject\s*=)/,
      "$1" + productDepSection + "$2"
    );
  }

  // Add packageReferences to project object
  if (!pbxproj.includes("packageReferences")) {
    pbxproj = pbxproj.replace(
      /(developmentRegion\s*=\s*\w+;)/,
      `$1
			packageReferences = (
				${packageRefUUID} /* XCRemoteSwiftPackageReference "mobile-chat-sdk-ios" */,
			);`
    );
  }

  // Find main target and add package product dependency
  const targetMatch = pbxproj.match(
    /([A-F0-9]{24})\s*\/\*\s*\w+\s*\*\/\s*=\s*\{[^}]*isa\s*=\s*PBXNativeTarget[^}]*productType\s*=\s*"com\.apple\.product-type\.application"[^}]*\}/
  );

  if (targetMatch && !pbxproj.includes("packageProductDependencies")) {
    const targetUUID = targetMatch[1];
    // Find the target block and add packageProductDependencies
    pbxproj = pbxproj.replace(
      new RegExp(
        `(${targetUUID}[\\s\\S]*?buildPhases\\s*=\\s*\\([^)]+\\);)`,
        "m"
      ),
      `$1
			packageProductDependencies = (
				${packageProductUUID} /* HubspotMobileSDK */,
			);`
    );
  }

  fs.writeFileSync(pbxprojPath, pbxproj);
  console.log("[HubspotChat] Successfully added HubSpot SDK to Xcode project");
  console.log(
    "[HubspotChat] NOTE: You may need to open Xcode and verify the package was added correctly"
  );
};

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

function generateUUID() {
  const chars = "0123456789ABCDEF";
  let uuid = "";
  for (let i = 0; i < 24; i++) {
    uuid += chars[Math.floor(Math.random() * 16)];
  }
  return uuid;
}
