# takt. — smarter Salon-Terminassistent (Prototyp)

Ein Salon-Terminassistent mit **echter WhatsApp Cloud API (optional)** über Cloudflare Pages Functions und Cloudflare D1. Ohne Zugangsdaten bleibt die bisherige Browser-Simulation vollständig nutzbar. Echte Nachrichten erscheinen nach Admin-Anmeldung im Tab **WhatsApp Live** und echte Buchungen im Kalender.

## Funktionen

- **Dashboard** mit Kennzahlen, Wochenübersicht, Tagesagenda, Live-Testchat und anstehenden Buchungen
- **Wochenkalender** für zwei Teammitglieder mit klickbaren Terminen und manueller Terminerfassung
- **Chat-Simulation:** Kundennachrichten in freier Alltagssprache eingeben, z. B. `Ich möchte am 13.11. um 15 Uhr Haare schneiden lassen`
- **Terminassistent:** erkennt Datum, Uhrzeit, Leistung, Bestätigung und Absage; fragt fehlende Angaben nach
- **Verfügbarkeitsprüfung:** Öffnungszeiten, 30-Minuten-Mittagspause, Dauer der Behandlung, Teamkapazität und Überschneidungen
- **Alternativtermine**, wenn ein Wunschzeitpunkt belegt ist
- **Erst bestätigen, dann buchen:** Der Assistent trägt nichts ein, bevor der Testkunde zugestimmt hat; prüft beim Bestätigen erneut
- **Leistungen bearbeiten:** Namen, Preise und Dauer ändern
- **Mehrere Testgespräche** und lokale Speicherung mit `localStorage`

## Start

Keine externen Bibliotheken, Datenbank oder API-Schlüssel erforderlich. Deploy als **statische Website** auf Cloudflare Pages: Repository verbinden, Framework = `None`, Build command leer, Output directory = `/` (Root).

Für die lokale Entwicklung:

```bash
npm run dev
```

Optional können Dateien auch mit einem lokalen HTTP-Server bereitgestellt werden (z. B. `python3 -m http.server 4173`). Die ES-Module funktionieren bei gewöhnlichem `file://`-Öffnen je nach Browser nicht.

## Testablauf

1. Unter **Nachrichten** den Testchat öffnen.
2. `Ich möchte am 13.11. um 15 Uhr Haare schneiden lassen` eingeben (im Ausgangs-Demoszenario November 2026). In der Demonstration sind beide Stylistinnen am kommenden Freitag um 15 Uhr ausgebucht.
3. Alternative auswählen, z. B. `16:00 Uhr passt`, und `Ja, bitte buchen` senden.
4. Die Buchung erscheint sofort im Kalender. Ein weiterer Chat kann den Termin nicht doppelt belegen, wenn beide Mitarbeiterinnen bereits gebucht sind.
5. Testdaten können unter **Einstellungen → Demo zurücksetzen** zurückgesetzt werden.

> Die Beispieldaten werden dynamisch zum heutigen Datum erzeugt. Der konkrete Freitag kann sich deshalb je nach Startdatum ändern.


## WhatsApp Cloud API verbinden (Cloudflare Pages)

**Voraussetzungen:** Cloudflare-Pages-Projekt mit GitHub-Repository `knodelt/termin`, Meta-Developer-Konto, WhatsApp Business Platform (Cloud API). Die Nummern und Zugangsdaten musst du selbst in Meta und Cloudflare hinterlegen. **Keinen API-Schlüssel ins GitHub-Repository oder in einen Chat kopieren.**

1. **D1-Datenbank:** Cloudflare → Workers & Pages → D1 → Neue Datenbank, z. B. `takt-live`. Das SQL-Schema aus `migrations/0001_whatsapp.sql` einmal auf der D1-Datenbank ausführen (beispielsweise mit Wrangler: `npx wrangler d1 execute takt-live --remote --file=migrations/0001_whatsapp.sql`).
2. **D1 anbinden:** Im Pages-Projekt → Settings → Bindings → Add → D1 database. **Variablenname exakt `DB`**, Datenbank `takt-live` auswählen. Danach ein neues Deployment auslösen.
3. **Secrets im Pages-Projekt:** Unter Settings → Variables and Secrets auf **Encrypt** stellen für:
   - `WA_VERIFY_TOKEN` – selbst gewählter langer zufälliger String (derselbe Wert muss in Meta unter Webhooks stehen).
   - `META_APP_SECRET` – App Secret aus Meta → App Settings → Basic, für die kryptografische Webhook-Signaturprüfung.
   - `WA_ACCESS_TOKEN` – WhatsApp Cloud API-Zugriffstoken. Für einen ersten Test geht ein temporärer Token; für den Dauerbetrieb einen berechtigten Systemnutzer-Token verwenden.
   - `WA_PHONE_NUMBER_ID` – Phone Number ID (nicht die sichtbare Telefonnummer) aus Meta WhatsApp → API Setup.
   - `ADMIN_API_KEY` – **eigener, zufälliger geheimer Admin-Schlüssel**, mindestens 32 Zeichen, nur für den geschützten Live-Bereich der Website.
   - Optional die Textvariable `WA_GRAPH_VERSION=v25.0` (API-Version an die aktuell in Meta unterstützte Version anpassen).
   Die Secrets **auch für Production** setzen, wenn du die Pages-Produktionsadresse verwendest; anschließend erneut deployen.
4. **Meta-Webhook:** Bei Meta for Developers → WhatsApp → Configuration / Webhooks als **Callback-URL** die öffentliche HTTPS-Adresse `https://DEIN-PAGES-PROJEKT.pages.dev/api/whatsapp/webhook` hinterlegen; **Verify token** ist der Wert von `WA_VERIFY_TOKEN`. Auf das **messages**-Feld abonnieren. GET verifiziert den Webhook; POST verarbeitet eingehende WhatsApp-Nachrichten mit `x-hub-signature-256`.
5. **Erster Live-Test:** Mit einer in Meta erlaubten Testnummer an die Meta-Testnummer schreiben (später an eine registrierte echte Business-Nummer). Beispiel: `Ich brauche am 13.11. um 15 Uhr einen Damenhaarschnitt`. Der Assistent prüft den D1-Kalender und fragt vor dem Eintragen nach Bestätigung. Danach `Ja` schreiben. Die Antwort kommt über die Cloud API zurück.
6. **In der App:** Tab **WhatsApp Live** → `ADMIN_API_KEY` eingeben. Nach erfolgreicher Anmeldung werden echte Nachrichten und Buchungen geladen. Der Kalender zeigt dann **Live-Termine** statt Demo-Daten. Die Live-Abfrage ist read-only und fragt alle 30 Sekunden nach neuen Daten. Zugangsdaten und Live-Kundendaten werden nicht im lokalen Browser-Speicher persistiert.

### API-Endpunkte
- `GET /api/whatsapp/webhook` – Meta-Challenge-Validierung
- `POST /api/whatsapp/webhook` – signierte Nachrichten, D1-Buchung, automatischer Antwortversand
- `GET /api/live` – geschützter Lesezugriff für App-Kalender, Nachrichten und Termine (`Authorization: Bearer <ADMIN_API_KEY>`)

### Technischer Umfang der Live-Version
- Regelebasierte deutsche Texterkennung aus `src/core.js`, **noch keine generative KI**.
- Fragt bei fehlenden Angaben nach und bucht **erst nach ausdrücklicher Bestätigung**.
- Prüft Öffnungszeiten, Pausen, Behandlungsdauer und vorhandene Buchungen. SQLite-Trigger verhindert überlappende Live-Buchungen für dieselbe Mitarbeiterin sogar bei gleichzeitigen Webhooks.
- Unterstützt Terminanfragen, alternative Uhrzeiten und Absagen des nächsten eigenen Termins. Mehrfachbuchungen derselben Person werden nicht einzeln zur Auswahl angeboten.
- Doppelte Nachrichten werden anhand der Meta-Nachrichten-ID erkannt; Zustellfehler werden im Backend gekennzeichnet.
- Backend ist für **einen Salon** mit den derzeit fest hinterlegten Leistungen und Mitarbeiterinnen ausgelegt. Das Bearbeiten von Leistungen in der **Demo** verändert noch nicht die serverseitigen Live-Leistungen. Die manuelle Erstellung oder Absage von Live-Terminen in der Web-App ist aktuell deaktiviert.
- Admin-Zugriff ist für den **Prototyp** mit einem langen geheimen Token geschützt. Für den Produktivbetrieb empfehlen sich Cloudflare Access, Benutzerkonten/Rollen, sicherer Schlüsselwechsel, Löschkonzept/Datenschutz, Message-Retry-Queue und weitere Tests.
- Keine automatische Nachricht außerhalb des WhatsApp-Kundenservicefensters: Dafür benötigt man von Meta genehmigte Templates und die passenden Berechtigungen.

### Lokaler Test
`npm test` prüft die bestehende Datum-/Buchungslogik. Die Pages Functions benötigen für einen vollständigen Ende-zu-Ende-Test die D1-Bindung sowie gültige Meta-Testzugangsdaten; ein Cloudflare-Deployment erfolgt nicht automatisch durch den GitHub-Commit.

