# ioBroker.twinkly

Steuerung der Twinkly Lichterketten.

Für jedes angelegte Gerät werden die folgenden Informationen ausgelesen:
- Mode
- Helligkeit
- Name
- MQTT
- Timer
- Details
- Firmware Version

Für jedes angelegte Gerät können die folgenden Werte bearbeitet werden:
- Mode
- Helligkeit
- Name
- MQTT
- Timer

Der Aufbau pro Gerät sieht wie folgt aus:
```
Weihnachtsbaum : {
    name      : 'Weihnachtsbaum',       // Name für ioBroker
    ipAdresse : '192.168.178.53',       // IP-Adresse von der Twinkly-Lichterkette
    pingState : 'ping.0.192_168_178_53' // State vom Ping-Adapter, um zu prüfen ob Lichterkette verbunden ist.
} 
```
pingState ist nicht verpflichtend aber so kann das Polling gegen eine nicht existierende Verbindung (Lichterkette vom Strom getrennt) abgesichert werden.
