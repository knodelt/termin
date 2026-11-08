# takt. — smarter Salon-Terminassistent (Prototyp)

Ein funktionsfähiger, responsiver **Browser-Prototyp** für eine Friseur-Terminverwaltung mit WhatsApp-artiger Chat-Simulation. Fokus: Buchungslogik, Bedienkonzept, Kalender und automatische Antworten **ohne echte WhatsApp-Anbindung**.

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

## Hinweis: Was **noch nicht** enthalten ist

- **Keine WhatsApp Cloud API, kein WhatsApp-Versand, kein Webhook**. Der Messenger ist ausschließlich eine interaktive Simulation.
- **Keine KI-API.** Die Erkennung erfolgt regelbasiert und deckt grundlegende deutsche Formulierungen ab. Für komplexe Anfragen ist später ein LLM mit strukturierter Ausgabe sinnvoll.
- **Keine Benutzerkonten und kein Cloud-Sync.** Termine liegen nur im lokalen Browser und sind nicht zwischen Geräten synchronisiert. Produktiver Mehrbenutzerbetrieb erfordert eine persistente Datenbank und Transaktionen gegen Doppelbuchungen.
- **Keine echte Kundenidentität.** Absagen im Demo-Chat sind nur für Termine möglich, die in genau diesem Testchat gebucht wurden.
- Öffnungszeiten, Pause und Mitarbeiter sind im Prototyp fest vorgegeben; Behandlungsdauer/Preise können bearbeitet werden.

## Weg zum produktiven System

1. Cloudflare Worker als Backend, D1-Datenbank mit `salon_id`, `appointment_id`, `customer_id`, WhatsApp-IDs und Status.
2. Offizielle **WhatsApp Business Platform / Cloud API** mit sicherem Webhook und Signaturprüfung, verifizierten Credentials als Secrets, Zustell-/Fehlerbehandlung sowie Opt-in und Template-Regeln.
3. **Transaktionale Buchungslogik** im Backend, inklusive atomarer Konfliktvermeidung, Öffnungszeiten, Mitarbeiter-/Serviceverwaltung und Zeitzonen.
4. Authentifizierung, Salon-Mandantentrennung, DSGVO-Prozesse und dokumentierte Aufbewahrungsfristen.
5. Optional ein LLM zur Spracherkennung — die KI darf nur Buchungsabsichten aufbereiten, **niemals direkt Kalender-Daten ohne serverseitige Prüfung verändern**.

## Tests

```bash
npm test
```

Technologie: HTML, CSS, JavaScript ES Modules. Keine Abhängigkeiten für das Frontend.
