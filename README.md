# cordova-plugin-hubspot-chat

Cordova plugin for HubSpot Mobile Chat SDK (iOS & Android).

## Installation

From GitHub:

```bash
cordova plugin add https://github.com/woub-chat/cordova-plugin-hubspot-chat.git \
  --variable HUBSPOT_PORTAL_ID=YOUR_PORTAL_ID \
  --variable HUBSPOT_HUB_ID=YOUR_HUB_ID \
  --variable HUBSPOT_DEFAULT_CHAT_FLOW=support
```

From local path:

```bash
cordova plugin add /path/to/cordova-plugin-hubspot-chat \
  --variable HUBSPOT_PORTAL_ID=YOUR_PORTAL_ID \
  --variable HUBSPOT_HUB_ID=YOUR_HUB_ID \
  --variable HUBSPOT_DEFAULT_CHAT_FLOW=support
```

## Configuration

### Required Variables

| Variable | Description |
|----------|-------------|
| `HUBSPOT_PORTAL_ID` | Your HubSpot Portal ID |
| `HUBSPOT_HUB_ID` | Your HubSpot Hub ID (usually same as Portal ID) |
| `HUBSPOT_DEFAULT_CHAT_FLOW` | Default chat flow name (optional, defaults to "support") |

### iOS Additional Setup

After installing the plugin, you need to manually add the HubSpot SDK via Swift Package Manager in Xcode:

1. Open your iOS project in Xcode (`platforms/ios/YourApp.xcworkspace`)
2. Go to **File > Add Package Dependencies...**
3. Enter the URL: `https://github.com/HubSpot/mobile-chat-sdk-ios`
4. Select version `1.0.0` or later
5. Add to your main target

The plugin hook attempts to add this automatically, but manual verification is recommended.

### Android Additional Setup

The plugin automatically creates `hubspot-info.json` in your Android assets folder.

## Usage

### Show Chat

```javascript
HubspotChat.show(
  function() { console.log('Chat opened'); },
  function(error) { console.error('Error:', error); }
);

// With specific chat flow
HubspotChat.show('sales',
  function() { console.log('Chat opened'); },
  function(error) { console.error('Error:', error); }
);
```

### Hide Chat

```javascript
HubspotChat.hide(
  function() { console.log('Chat closed'); },
  function(error) { console.error('Error:', error); }
);
```

### Set User Identity

```javascript
HubspotChat.setUserIdentity('user@example.com', 'optional-identity-token',
  function() { console.log('Identity set'); },
  function(error) { console.error('Error:', error); }
);
```

### Set Chat Properties

```javascript
HubspotChat.setChatProperties({
  'subscription-tier': 'premium',
  'user-type': 'customer'
},
  function() { console.log('Properties set'); },
  function(error) { console.error('Error:', error); }
);
```

### Logout / Clear User Data

```javascript
HubspotChat.logout(
  function() { console.log('User data cleared'); },
  function(error) { console.error('Error:', error); }
);
```

## Platform Support

- iOS 13.0+
- Android API 24+

## Dependencies

- **iOS**: HubSpot Mobile SDK via Swift Package Manager (`https://github.com/HubSpot/mobile-chat-sdk-ios`)
- **Android**: `com.hubspot.mobilechatsdk:mobile-chat-sdk-android:1.0.+`

## License

MIT
