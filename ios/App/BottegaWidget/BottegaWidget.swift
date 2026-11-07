import SwiftUI
import WidgetKit

// What friends have on right now, at a glance on the home screen.
// The app writes a small JSON snapshot into the shared app group (App/WidgetBridge.swift); this reads it.

struct FriendNow: Codable, Hashable {
    let username: String
    let line: String      // "put on Teardrop and left Normal People on the armchair"
    let title: String     // the main thing, e.g. "Teardrop"
    let kind: String      // "song", "film" or "book"
    let at: String
    let isNew: Bool
}

struct Snapshot: Codable {
    let updatedAt: String
    let friends: [FriendNow]
}

struct Entry: TimelineEntry {
    let date: Date
    let friends: [FriendNow]
    let signedIn: Bool
}

private let appGroup = "group.com.kkggr2.bottega"

func readSnapshot() -> Snapshot? {
    guard let json = UserDefaults(suiteName: appGroup)?.string(forKey: "friendsNow"),
          let data = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(Snapshot.self, from: data)
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry {
        Entry(date: .now, friends: [
            FriendNow(username: "mia", line: "put on Teardrop", title: "Teardrop", kind: "song", at: "", isNew: true),
            FriendNow(username: "cagla", line: "left Normal People on the armchair", title: "Normal People", kind: "book", at: "", isNew: false),
        ], signedIn: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        let snap = readSnapshot()
        completion(snap.map { Entry(date: .now, friends: $0.friends, signedIn: true) } ?? placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let snap = readSnapshot()
        let entry = Entry(date: .now, friends: snap?.friends ?? [], signedIn: snap != nil)
        // The app refreshes it whenever friends' rooms change; this is just a fallback.
        completion(Timeline(entries: [entry], policy: .after(.now.addingTimeInterval(60 * 60))))
    }
}

// Bottega's colors.
private let paper = Color(red: 0.949, green: 0.910, blue: 0.827)
private let ink = Color(red: 0.184, green: 0.157, blue: 0.133)
private let muted = Color(red: 0.420, green: 0.373, blue: 0.322)
private let rust = Color(red: 0.702, green: 0.333, blue: 0.180)

private func symbol(_ kind: String) -> String {
    switch kind {
    case "song": return "opticaldisc"
    case "film": return "tv"
    default: return "book.closed"
    }
}

struct FriendRow: View {
    let friend: FriendNow
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Image(systemName: symbol(friend.kind))
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(rust)
                .frame(width: 16)
            VStack(alignment: .leading, spacing: 1) {
                HStack(spacing: 5) {
                    Text("@\(friend.username)").font(.system(size: 13, weight: .semibold)).foregroundStyle(ink)
                    if friend.isNew { Circle().fill(rust).frame(width: 6, height: 6) }
                }
                Text(friend.line)
                    .font(.system(size: 13, design: .serif))
                    .foregroundStyle(muted)
                    .lineLimit(2)
            }
        }
    }
}

struct BottegaWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: Entry

    var shown: [FriendNow] { Array(entry.friends.prefix(family == .systemSmall ? 1 : family == .systemLarge ? 5 : 2)) }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Bottega").font(.system(size: 17, design: .serif)).foregroundStyle(ink)
            if shown.isEmpty {
                Spacer(minLength: 0)
                Text(entry.signedIn ? "When friends put something on, it shows up here." : "Open Bottega to see what friends have on.")
                    .font(.system(size: 13, design: .serif))
                    .foregroundStyle(muted)
                Spacer(minLength: 0)
            } else {
                ForEach(shown, id: \.self) { friend in
                    Link(destination: URL(string: "bottega://r/\(friend.username)")!) { FriendRow(friend: friend) }
                }
                Spacer(minLength: 0)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(URL(string: shown.first.map { "bottega://r/\($0.username)" } ?? "bottega://library"))
        .containerBackground(paper, for: .widget)
    }
}

@main
struct BottegaWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "BottegaFriendsNow", provider: Provider()) { entry in
            BottegaWidgetView(entry: entry)
        }
        .configurationDisplayName("Friends' rooms")
        .description("What your friends have on the turntable, in the TV and on the armchair.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
