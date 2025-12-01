# iOS Native App Setup

Deine Next.js App ist jetzt für iOS als native App konfiguriert! 🎉

## ✅ Was wurde gemacht:

1. ✅ Next.js für statischen Export konfiguriert
2. ✅ Capacitor installiert und konfiguriert
3. ✅ iOS Platform hinzugefügt
4. ✅ Build-Skripte erstellt

## 🚀 Verwendung:

### 1. App bauen und iOS synchronisieren:
```bash
npm run build:ios
```

### 2. Xcode öffnen:
```bash
npm run open:ios
```

Oder manuell:
```bash
open ios/App/App.xcworkspace
```

### 3. In Xcode:
- Wähle ein Device oder Simulator aus
- Klicke auf den Play-Button (▶️) zum Builden und Ausführen
- Die App wird auf deinem Gerät/Simulator gestartet

## 📝 Nächste Schritte:

1. **App Icon & Splash Screen** anpassen in Xcode
2. **Bundle ID** ändern falls nötig (aktuell: `com.pltracking.app`)
3. **Signing & Capabilities** in Xcode einrichten (für echte Geräte)
4. **App Store** vorbereiten (Info.plist, App Store Connect, etc.)

## 🔧 Nützliche Commands:

```bash
# Build für iOS
npm run build:ios

# Nur synchronisieren (nach Code-Änderungen)
npm run sync:ios

# Xcode öffnen
npm run open:ios
```

## ⚠️ Wichtige Hinweise:

- Nach jeder Code-Änderung: `npm run build:ios` ausführen
- Die native iOS-App läuft im `out/` Ordner (statischer Next.js Build)
- Für Entwicklung: weiterhin `npm run dev` im Browser nutzen
- Für native Features (Kamera, GPS, etc.): Capacitor Plugins verwenden

## 📱 Native Features hinzufügen:

Capacitor Plugins sind bereits installiert:
- `@capacitor/app` - App-Lifecycle
- `@capacitor/keyboard` - Keyboard-Handling
- `@capacitor/status-bar` - Status Bar Control

Weitere Plugins: https://capacitorjs.com/docs/plugins

## 🐛 Troubleshooting:

Wenn CocoaPods Fehler auftreten:
1. Xcode öffnen
2. Im Terminal: `cd ios/App` → `pod install`
3. Oder: `pod install --repo-update`

Viel Erfolg! 🚀

