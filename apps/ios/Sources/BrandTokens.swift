import SwiftUI

enum BrandTokens {
    // PostScript name read from the bundled approved TTF (default weight 800).
    // relativeTo preserves Dynamic Type; content titles have no fixed text height.
    static let contentTitle = Font.custom("BricolageGrotesque-96ptExtraBold", size: 17, relativeTo: .headline)
    static let navy = Color(red: 10.0/255, green: 31.0/255, blue: 78.0/255)
    static let action = Color(red: 1.0/255, green: 102.0/255, blue: 217.0/255)
}
