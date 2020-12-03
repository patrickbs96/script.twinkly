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
``` javascript
Weihnachtsbaum : {
    name           : 'Twinkly Weihnachtsbaum',       // Name für ioBroker (Falls nicht hinterlegt wird in diesem Fall "Weihnachtsbaum" genommen)
    ipAdresse      : '192.168.178.53',               // IP-Adresse von der Twinkly-Lichterkette
    connectedState : 'ping.0.Twinkly_Weihnachtsbaum' // State mit true/false der den aktuellen Status der Lichterkette überwacht (bspw. ping, tr-064)
}
```
connectedState ist nicht verpflichtend aber so kann das Polling gegen eine nicht existierende Verbindung (Lichterkette vom Strom getrennt) abgesichert werden.
