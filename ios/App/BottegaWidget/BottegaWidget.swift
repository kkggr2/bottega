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
    /// File name of the cover the app saved in the shared folder, if any.
    let image: String?
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
            FriendNow(username: "mia", line: "put on Teardrop", title: "Teardrop", kind: "song", at: "", isNew: true, image: nil),
            FriendNow(username: "cagla", line: "left Normal People on the armchair", title: "Normal People", kind: "book", at: "", isNew: false, image: nil),
            FriendNow(username: "jo", line: "put Paris, Texas in the TV", title: "Paris, Texas", kind: "film", at: "", isNew: false, image: nil),
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

func coverImage(_ name: String?) -> UIImage? {
    guard let name,
          let base = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup) else { return nil }
    return UIImage(contentsOfFile: base.appendingPathComponent("widget-covers/\(name)").path)
}

/// One friend's cover: the album, poster or book they put out, with their name and a small badge.
/// The cover fills a fixed frame and is clipped to it, whatever its shape.
struct CoverTile: View {
    let friend: FriendNow
    var height: CGFloat? = nil
    var showTitle = false

    @ViewBuilder var cover: some View {
        if let image = coverImage(friend.image) {
            Image(uiImage: image).resizable().scaledToFill()
        } else {
            // No cover: the title set in type on a warm card.
            ZStack(alignment: .topLeading) {
                LinearGradient(colors: [rust, Color(red: 0.36, green: 0.16, blue: 0.09)], startPoint: .topLeading, endPoint: .bottomTrailing)
                Text(friend.title).font(.system(size: 12, design: .serif)).foregroundStyle(paper)
                    .lineLimit(3).padding(.horizontal, 6).padding(.top, 24)
            }
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Color.clear
                .frame(maxWidth: .infinity, minHeight: height, maxHeight: height ?? .infinity)
                .overlay { cover }
                .overlay(alignment: .bottomLeading) {
                    ZStack(alignment: .bottomLeading) {
                        // Name on a soft shade so it reads on any cover.
                        LinearGradient(colors: [.clear, .black.opacity(0.6)], startPoint: .top, endPoint: .bottom).frame(height: 30)
                        Text("@\(friend.username)")
                            .font(.system(size: 11, weight: .semibold)).foregroundStyle(.white).lineLimit(1)
                            .padding(.horizontal, 6).padding(.bottom, 5)
                    }
                }
                .overlay(alignment: .topLeading) {
                    Image(systemName: symbol(friend.kind))
                        .font(.system(size: 9, weight: .bold)).foregroundStyle(ink)
                        .padding(4).background(Circle().fill(paper.opacity(0.92))).padding(4)
                }
                .overlay(alignment: .topTrailing) {
                    if friend.isNew { Circle().fill(rust).frame(width: 8, height: 8).overlay(Circle().stroke(paper, lineWidth: 1.5)).padding(6) }
                }
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                .shadow(color: .black.opacity(0.18), radius: 3, y: 2)

            if showTitle {
                Text(friend.title).font(.system(size: 11, design: .serif)).foregroundStyle(muted).lineLimit(1)
            }
        }
    }
}

struct BottegaWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: Entry

    var limit: Int { family == .systemSmall ? 1 : family == .systemLarge ? 6 : 3 }
    var shown: [FriendNow] { Array(entry.friends.prefix(limit)) }
    func link(_ f: FriendNow) -> URL { URL(string: "bottega://r/\(f.username)")! }

    var body: some View {
        Group {
            if shown.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Bottega").font(.system(size: 17, design: .serif)).foregroundStyle(ink)
                    Spacer(minLength: 0)
                    Text(entry.signedIn ? "When friends put something on, it shows up here." : "Open Bottega to see what friends have on.")
                        .font(.system(size: 13, design: .serif)).foregroundStyle(muted)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            } else if family == .systemSmall {
                CoverTile(friend: shown[0])
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(alignment: .firstTextBaseline) {
                        Text("Bottega").font(.system(size: 15, design: .serif)).foregroundStyle(ink)
                        Spacer()
                        Text("friends have on").font(.system(size: 11)).foregroundStyle(muted)
                    }
                    let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 3)
                    LazyVGrid(columns: columns, spacing: 10) {
                        ForEach(shown, id: \.self) { friend in
                            Link(destination: link(friend)) {
                                CoverTile(friend: friend, height: family == .systemLarge ? 146 : 104, showTitle: family == .systemLarge)
                            }
                        }
                    }
                    Spacer(minLength: 0)
                }
            }
        }
        .widgetURL(shown.first.map(link) ?? URL(string: "bottega://library"))
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
