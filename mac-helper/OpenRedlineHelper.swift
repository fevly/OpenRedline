import AppKit
import Foundation

final class OpenRedlineHelper: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem!
    private var serverProcess: Process?
    private var statusTimer: Timer?

    private let projectPath: String
    private let localURL = URL(string: "https://localhost:3000/src/taskpane.html")!
    private let healthURL = URL(string: "https://localhost:3000/api/health")!
    private let githubURL = URL(string: "https://github.com/fevly/openredline")!

    override init() {
        let executable = Bundle.main.executableURL ?? URL(fileURLWithPath: CommandLine.arguments[0])
        let bundleURL = executable
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
        let installedProjectPath = "/Library/Application Support/OpenRedline"
        if FileManager.default.fileExists(atPath: installedProjectPath) {
            projectPath = installedProjectPath
        } else {
            projectPath = bundleURL.deletingLastPathComponent().deletingLastPathComponent().path
        }
        super.init()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let button = statusItem.button {
            button.image = nil
            button.attributedTitle = statusTitle(isRunning: false)
        }
        statusItem.button?.toolTip = "OpenRedline"
        rebuildMenu(isRunning: false)
        refreshStatus()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in
            self?.startServerIfNeeded()
        }
        statusTimer = Timer.scheduledTimer(withTimeInterval: 8, repeats: true) { [weak self] _ in
            self?.refreshStatus()
        }
    }

    private func rebuildMenu(isRunning: Bool) {
        let menu = NSMenu()
        let status = NSMenuItem(title: isRunning ? "后端：运行中" : "后端：未运行", action: nil, keyEquivalent: "")
        status.isEnabled = false
        menu.addItem(status)
        menu.addItem(.separator())
        menu.addItem(NSMenuItem(title: "启动后端", action: #selector(startServer), keyEquivalent: "s"))
        menu.addItem(NSMenuItem(title: "停止后端", action: #selector(stopServer), keyEquivalent: "x"))
        menu.addItem(.separator())
        menu.addItem(NSMenuItem(title: "打开配置", action: #selector(openConfig), keyEquivalent: "o"))
        menu.addItem(NSMenuItem(title: "打开 GitHub", action: #selector(openGitHub), keyEquivalent: "g"))
        menu.addItem(.separator())
        menu.addItem(NSMenuItem(title: "退出", action: #selector(quit), keyEquivalent: "q"))
        menu.items.forEach { $0.target = self }
        statusItem.menu = menu
        statusItem.button?.image = nil
        statusItem.button?.attributedTitle = statusTitle(isRunning: isRunning)
    }

    private func statusTitle(isRunning: Bool) -> NSAttributedString {
        let title = NSMutableAttributedString(
            string: "OR ",
            attributes: [
                .font: NSFont.menuBarFont(ofSize: 13),
                .foregroundColor: NSColor.labelColor
            ]
        )
        title.append(NSAttributedString(
            string: "●",
            attributes: [
                .font: NSFont.menuBarFont(ofSize: 12),
                .foregroundColor: isRunning ? NSColor.systemRed : NSColor.tertiaryLabelColor
            ]
        ))
        return title
    }

    private func refreshStatus() {
        var request = URLRequest(url: healthURL)
        request.timeoutInterval = 2
        URLSession.shared.dataTask(with: request) { [weak self] _, response, _ in
            let ok = (response as? HTTPURLResponse)?.statusCode == 200
            DispatchQueue.main.async {
                self?.rebuildMenu(isRunning: ok)
            }
        }.resume()
    }

    @objc private func startServer() {
        startServerIfNeeded()
    }

    private func startServerIfNeeded() {
        if serverProcess?.isRunning == true {
            refreshStatus()
            return
        }
        if backendPortIsListening() {
            refreshStatus()
            return
        }

        let process = Process()
        process.currentDirectoryURL = URL(fileURLWithPath: projectPath)
        let nodeURL = nodeExecutableURL()
        process.executableURL = nodeURL
        process.arguments = nodeURL.path == "/usr/bin/env" ? ["node", "server.js"] : ["server.js"]
        process.environment = processEnvironment()

        let logURL = URL(fileURLWithPath: projectPath).appendingPathComponent("openredline-helper.log")
        if !FileManager.default.fileExists(atPath: logURL.path) {
            FileManager.default.createFile(atPath: logURL.path, contents: nil)
        }
        if let handle = try? FileHandle(forWritingTo: logURL) {
            handle.seekToEndOfFile()
            process.standardOutput = handle
            process.standardError = handle
        }

        do {
            try process.run()
            serverProcess = process
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { [weak self] in
                self?.refreshStatus()
            }
        } catch {
            showAlert("无法启动后端", message: error.localizedDescription)
        }
    }

    private func backendPortIsListening() -> Bool {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/sbin/lsof")
        process.arguments = ["-tiTCP:3000", "-sTCP:LISTEN"]
        let pipe = Pipe()
        process.standardOutput = pipe
        do {
            try process.run()
            process.waitUntilExit()
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            return process.terminationStatus == 0 && !data.isEmpty
        } catch {
            return false
        }
    }

    private func nodeExecutableURL() -> URL {
        let candidates = [
            "/opt/homebrew/bin/node",
            "/usr/local/bin/node",
            "/usr/bin/node"
        ]
        if let path = candidates.first(where: { FileManager.default.isExecutableFile(atPath: $0) }) {
            return URL(fileURLWithPath: path)
        }
        return URL(fileURLWithPath: "/usr/bin/env")
    }

    private func processEnvironment() -> [String: String] {
        var environment = ProcessInfo.processInfo.environment
        let fallbackPath = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
        if let currentPath = environment["PATH"], !currentPath.isEmpty {
            environment["PATH"] = "\(fallbackPath):\(currentPath)"
        } else {
            environment["PATH"] = fallbackPath
        }
        return environment
    }

    @objc private func stopServer() {
        if let process = serverProcess, process.isRunning {
            process.terminate()
            serverProcess = nil
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { [weak self] in
                self?.refreshStatus()
            }
            return
        }

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/sbin/lsof")
        process.arguments = ["-tiTCP:3000", "-sTCP:LISTEN"]
        let pipe = Pipe()
        process.standardOutput = pipe
        do {
            try process.run()
            process.waitUntilExit()
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            let output = String(data: data, encoding: .utf8) ?? ""
            let pids = output
                .components(separatedBy: CharacterSet.whitespacesAndNewlines)
                .filter { !$0.isEmpty }
            for pid in pids {
                let kill = Process()
                kill.executableURL = URL(fileURLWithPath: "/bin/kill")
                kill.arguments = [pid]
                try? kill.run()
            }
            refreshStatus()
        } catch {
            showAlert("无法停止后端", message: error.localizedDescription)
        }
    }

    @objc private func openConfig() {
        NSWorkspace.shared.open(localURL)
    }

    @objc private func openGitHub() {
        NSWorkspace.shared.open(githubURL)
    }

    @objc private func quit() {
        statusTimer?.invalidate()
        NSApp.terminate(nil)
    }

    private func showAlert(_ title: String, message: String) {
        let alert = NSAlert()
        alert.messageText = title
        alert.informativeText = message
        alert.runModal()
    }
}

let app = NSApplication.shared
let delegate = OpenRedlineHelper()
app.delegate = delegate
app.run()
