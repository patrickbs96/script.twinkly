# script.twinkly

Steuerung der Twinkly Lichterketten.

### Für jedes angelegte Gerät werden die folgenden Informationen ausgelesen:
- Mode (An/Aus)
- Helligkeit
- Name
- MQTT
- Timer
- Details
- Firmware Version

### Für jedes angelegte Gerät können die folgenden Werte bearbeitet werden:
- Mode (An/Aus)
- Helligkeit
- Name
- MQTT
- Timer

### Der Aufbau pro Gerät sieht wie folgt aus:
``` javascript
const devices = {
    Twinkly1 : {                                         // State-Name in ioBroker
        name           : 'Twinkly Lichterkette 1',       // Name für ioBroker (Falls nicht hinterlegt wird der State-Name verwendet)
        ipAdresse      : '192.168.178.52',               // IP-Adresse von der Twinkly-Lichterkette
        connectedState : 'ping.0.Twinkly_Lichterkette_1' // State mit true/false der den aktuellen Status der Lichterkette überwacht (bspw. ping, tr-064)
    },
    Twinkly2 : {                                         // State-Name in ioBroker
        name           : 'Twinkly Lichterkette 2',       // Name für ioBroker (Falls nicht hinterlegt wird der State-Name verwendet)
        ipAdresse      : '192.168.178.53',               // IP-Adresse von der Twinkly-Lichterkette
        connectedState : 'ping.0.Twinkly_Lichterkette_2' // State mit true/false der den aktuellen Status der Lichterkette überwacht (bspw. ping, tr-064)
    }
};
```
connectedState ist nicht verpflichtend aber so kann das Polling gegen eine nicht existierende Verbindung (Lichterkette vom Strom getrennt) abgesichert werden.

### Folgende Einstellungen stehen zusätzlich noch zur Verfügung:
``` javascript
const PATH_ID          = 'javascript.0.MyDevices.Twinkly.'; // Pfad für die Datenpunkte
const POLLING_IN_SEK   = 60;                                // Wie oft sollen die Daten abgefragt werden
const EXTENDED_LOGGING = false;                             // Mehr Informationen loggen
```
