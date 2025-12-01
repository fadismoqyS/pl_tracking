# App für Kollegen verfügbar machen 📱

Es gibt mehrere Möglichkeiten, wie deine Kollegen die App herunterladen können:

---

## Option 1: TestFlight (EMPFOHLEN für Beta-Testing) 🚀

**TestFlight** ist Apples offizielle Beta-Testing-Plattform. Hier können bis zu 10.000 Tester die App vor der Veröffentlichung testen.

### Vorteile:
- ✅ Einfach zu nutzen
- ✅ Automatische Updates
- ✅ Feedback-System
- ✅ Kein Jailbreak nötig
- ✅ Bis zu 90 Tage Testdauer pro Build

### Schritte:

#### 1. Apple Developer Account benötigt
- Kosten: **99€/Jahr** (für Organisation/Unternehmen)
- Oder kostenlos: **Apple Developer Program** (persönlich, limitierte Funktionen)

#### 2. App Store Connect einrichten
1. Gehe zu: https://appstoreconnect.apple.com
2. Erstelle ein neues App-Projekt
3. Wähle: **iOS App**
4. Fülle aus:
   - **Name:** PL Tracking
   - **Primary Language:** Deutsch
   - **Bundle ID:** `com.pltracking.app` (bereits konfiguriert)
   - **SKU:** pltracking-001

#### 3. Xcode: App signieren und archivieren
1. Öffne Xcode: `npm run open:ios`
2. Wähle **"Any iOS Device"** oder dein iPhone als Target
3. **Product → Archive** (wenn grau: erst auf Device/Simulator bauen)
4. Warte bis Archive erstellt ist
5. Im **Organizer** Fenster:
   - Wähle dein Archive
   - Klicke **"Distribute App"**
   - Wähle **"App Store Connect"**
   - Folgende Schritte:
     - **Upload** → Next
     - **Distribution** → Next
     - **App Thinning: All compatible device variants**
     - Wähle dein **Team** (Apple Developer Account)
     - **Upload** → Warte bis Upload fertig ist

#### 4. TestFlight Build hochladen
1. Gehe zu **App Store Connect** → Deine App → **TestFlight**
2. Warte ca. 5-30 Minuten (Apple verarbeitet den Upload)
3. Status wird **"Ready to Test"** sein
4. Füge Tester hinzu:
   - **Internal Testing:** Bis zu 100 Tester (sofort verfügbar)
   - **External Testing:** Bis zu 10.000 Tester (Apple Review nötig, ca. 24-48h)

#### 5. Tester einladen
1. Gehe zu **TestFlight** → **Internal Testing**
2. Klicke **"+ Tester hinzufügen"**
3. Füge E-Mail-Adressen deiner Kollegen hinzu
4. Tester erhalten eine E-Mail mit Download-Link
5. Kollegen installieren **TestFlight App** (App Store)
6. Kollegen öffnen TestFlight und installieren deine App

---

## Option 2: App Store (Öffentliche Veröffentlichung) 📦

Für die öffentliche Veröffentlichung im App Store:

### Schritte:
1. Alle Schritte wie bei TestFlight
2. In **App Store Connect** → **App Information**:
   - App Store Listing ausfüllen
   - Screenshots hinzufügen (verschiedene iPhone/iPad Größen)
   - App Beschreibung, Keywords, etc.
3. **Submit for Review**
4. Apple prüft (1-7 Tage)
5. Nach Genehmigung: App ist öffentlich verfügbar

---

## Option 3: Ad-hoc Distribution (Ohne App Store) 🔒

**Nur für max. 100 Geräte** - Direkte Installation über IPA-Datei.

### Vorteile:
- ✅ Kein App Store Review nötig
- ✅ Schnell für kleine Teams

### Nachteile:
- ❌ Max. 100 Geräte
- ❌ Manuelles Verteilen der IPA-Datei
- ❌ Jedes Gerät muss registriert werden

### Schritte:
1. In Xcode: **Product → Archive**
2. **Distribute App** → **Ad Hoc**
3. Wähle dein Team
4. Exportiere IPA-Datei
5. Registriere Geräte in Apple Developer Portal
6. Verteile IPA-Datei an Kollegen (per E-Mail/Dropbox)
7. Kollegen installieren über Finder (Mac) oder iTunes

---

## Option 4: Enterprise Distribution (Für Unternehmen) 🏢

**Nur für Unternehmen** mit Apple Enterprise Program ($299/Jahr).

- Eigene interne Verteilung
- Unbegrenzte Geräte
- Kein App Store nötig

---

## 🎯 Empfehlung für dich:

### Für Start: **TestFlight (Internal Testing)**
- Schnell und einfach
- Automatische Updates
- Perfekt für kleine Teams (bis 100 Personen)

### Später: **App Store (Public)**
- Öffentlich verfügbar
- Professionell
- Jeder kann die App finden

---

## 📋 Checkliste für TestFlight:

- [ ] Apple Developer Account (99€/Jahr)
- [ ] App in App Store Connect erstellt
- [ ] Xcode: Team ausgewählt (Signing & Capabilities)
- [ ] Archive erstellt und hochgeladen
- [ ] TestFlight Build bereit ("Ready to Test")
- [ ] Tester hinzugefügt (E-Mail-Adressen)
- [ ] Kollegen haben TestFlight App installiert

---

## 🔧 Quick Commands:

```bash
# 1. App bauen
npm run build && npx cap sync ios

# 2. Xcode öffnen
npm run open:ios

# 3. In Xcode:
# - Device wählen
# - Product → Archive
# - Distribute App → App Store Connect
```

---

## 💡 Tipp:

Wenn du noch keinen Apple Developer Account hast:
1. Erstelle einen bei: https://developer.apple.com/programs/
2. Kostet 99€/Jahr (Standard) oder 299€/Jahr (Enterprise)
3. Warte auf Aktivierung (1-2 Tage)

**Für kostenloses Testing** kannst du auch:
- Auf deinem eigenen iPhone installieren (kostenlos)
- Bis zu 3 Kollegen können dein Apple ID nutzen (begrenzt)

---

**Brauchst du Hilfe bei einem Schritt? Lass es mich wissen!** 🚀


