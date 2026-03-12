import Foundation
import UIKit
import SwiftUI
import HubspotMobileSDK

@objc(HubspotChatPlugin)
class HubspotChatPlugin: CDVPlugin {
    
    private var isConfigured = false
    
    override func pluginInitialize() {
        super.pluginInitialize()
        configureSDK()
    }
    
    private func configureSDK() {
        guard !isConfigured else { return }
        
        do {
            try HubspotManager.configure()
            isConfigured = true
            print("[HubspotChat] SDK configured successfully")
        } catch {
            print("[HubspotChat] Failed to configure SDK: \(error)")
        }
    }
    
    @objc(configure:)
    func configure(command: CDVInvokedUrlCommand) {
        configureSDK()
        
        let result = CDVPluginResult(status: isConfigured ? .ok : .error, messageAs: isConfigured ? "Configured" : "Failed to configure")
        commandDelegate.send(result, callbackId: command.callbackId)
    }
    
    @objc(show:)
    func show(command: CDVInvokedUrlCommand) {
        guard isConfigured else {
            let result = CDVPluginResult(status: .error, messageAs: "HubSpot SDK not configured")
            commandDelegate.send(result, callbackId: command.callbackId)
            return
        }
        
        let chatFlow = command.arguments.first as? String
        
        DispatchQueue.main.async { [weak self] in
            guard let self = self,
                  let viewController = self.viewController else {
                let result = CDVPluginResult(status: .error, messageAs: "No view controller available")
                self?.commandDelegate.send(result, callbackId: command.callbackId)
                return
            }
            
            let chatView: HubspotChatView
            if let flow = chatFlow, !flow.isEmpty {
                chatView = HubspotChatView(chatFlow: flow)
            } else {
                chatView = HubspotChatView()
            }
            
            let hostingController = UIHostingController(rootView: chatView)
            hostingController.modalPresentationStyle = .pageSheet
            
            viewController.present(hostingController, animated: true) {
                let result = CDVPluginResult(status: .ok)
                self.commandDelegate.send(result, callbackId: command.callbackId)
            }
        }
    }
    
    @objc(hide:)
    func hide(command: CDVInvokedUrlCommand) {
        DispatchQueue.main.async { [weak self] in
            self?.viewController?.dismiss(animated: true) {
                let result = CDVPluginResult(status: .ok)
                self?.commandDelegate.send(result, callbackId: command.callbackId)
            }
        }
    }
    
    @objc(setUserIdentity:)
    func setUserIdentity(command: CDVInvokedUrlCommand) {
        guard command.arguments.count >= 1,
              let email = command.arguments[0] as? String, !email.isEmpty else {
            let result = CDVPluginResult(status: .error, messageAs: "Email is required")
            commandDelegate.send(result, callbackId: command.callbackId)
            return
        }
        
        let identityToken = command.arguments.count > 1 ? command.arguments[1] as? String : nil
        
        if let token = identityToken, !token.isEmpty {
            HubspotManager.shared.setUserIdentity(identityToken: token, email: email)
        } else {
            HubspotManager.shared.setUserIdentity(identityToken: "", email: email)
        }
        
        let result = CDVPluginResult(status: .ok)
        commandDelegate.send(result, callbackId: command.callbackId)
    }
    
    @objc(clearUserIdentity:)
    func clearUserIdentity(command: CDVInvokedUrlCommand) {
        HubspotManager.shared.clearUserData()
        
        let result = CDVPluginResult(status: .ok)
        commandDelegate.send(result, callbackId: command.callbackId)
    }
    
    @objc(setChatProperties:)
    func setChatProperties(command: CDVInvokedUrlCommand) {
        guard command.arguments.count >= 1,
              let properties = command.arguments[0] as? [String: String] else {
            let result = CDVPluginResult(status: .error, messageAs: "Properties must be a dictionary")
            commandDelegate.send(result, callbackId: command.callbackId)
            return
        }
        
        HubspotManager.shared.setChatProperties(data: properties)
        
        let result = CDVPluginResult(status: .ok)
        commandDelegate.send(result, callbackId: command.callbackId)
    }
    
    @objc(logout:)
    func logout(command: CDVInvokedUrlCommand) {
        HubspotManager.shared.clearUserData()
        
        let result = CDVPluginResult(status: .ok)
        commandDelegate.send(result, callbackId: command.callbackId)
    }
}
