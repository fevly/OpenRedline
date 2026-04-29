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
            button.image = statusIcon(isRunning: false)
            button.imagePosition = .imageOnly
        }
        statusItem.button?.toolTip = "OpenRedline"
        rebuildMenu(isRunning: false)
        refreshStatus()
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
        statusItem.button?.image = statusIcon(isRunning: isRunning)
    }

    private func statusIcon(isRunning: Bool) -> NSImage? {
        let size = NSSize(width: 18, height: 18)
        let icon = NSImage(size: size)
        icon.lockFocus()
        drawStatusGlyph(in: NSRect(origin: .zero, size: size), isRunning: isRunning)
        icon.unlockFocus()
        icon.isTemplate = false
        return icon
    }

    private func drawStatusGlyph(in rect: NSRect, isRunning: Bool) {
        let ink = NSColor.labelColor.withAlphaComponent(0.9)
        let red = NSColor(calibratedRed: 0.91, green: 0.14, blue: 0.18, alpha: 1)
        let center = NSPoint(x: rect.midX - 1.2, y: rect.midY)

        ink.setStroke()
        let openPath = NSBezierPath()
        openPath.lineWidth = 2.2
        openPath.lineCapStyle = .round
        openPath.appendArc(
            withCenter: NSPoint(x: rect.minX + 7.3, y: rect.midY),
            radius: 5.2,
            startAngle: 72,
            endAngle: 292,
            clockwise: false
        )
        openPath.stroke()

        (isRunning ? red : ink).setStroke()
        let corePath = NSBezierPath()
        corePath.lineWidth = 2.3
        corePath.lineCapStyle = .round
        corePath.move(to: NSPoint(x: center.x, y: rect.minY + 2.4))
        corePath.line(to: NSPoint(x: center.x, y: rect.maxY - 2.4))
        corePath.stroke()

        ink.setStroke()
        let rPath = NSBezierPath()
        rPath.lineWidth = 2.0
        rPath.lineJoinStyle = .miter
        rPath.lineCapStyle = .square
        rPath.move(to: NSPoint(x: rect.minX + 9.8, y: rect.midY + 3.0))
        rPath.line(to: NSPoint(x: rect.maxX - 3.2, y: rect.midY + 3.0))
        rPath.line(to: NSPoint(x: rect.minX + 11.9, y: rect.midY - 0.4))
        rPath.line(to: NSPoint(x: rect.maxX - 3.4, y: rect.minY + 2.7))
        rPath.stroke()

        let slash = NSBezierPath()
        slash.lineWidth = 1.2
        slash.lineCapStyle = .round
        slash.move(to: NSPoint(x: rect.maxX - 6.4, y: rect.minY + 4.3))
        slash.line(to: NSPoint(x: rect.maxX - 2.2, y: rect.minY + 1.8))
        slash.stroke()
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
        if serverProcess?.isRunning == true {
            refreshStatus()
            return
        }

        let process = Process()
        process.currentDirectoryURL = URL(fileURLWithPath: projectPath)
        process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        process.arguments = ["node", "server.js"]

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
