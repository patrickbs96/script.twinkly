/*******************************************************************************
 * ---------------------------
 * Twinkly Script for ioBroker
 * ---------------------------
 *
 * Steuerung der Twinkly Lichterketten.
 *
 * ----------------------------------------------------
 * Aktuelle Version:    https://github.com/patrickbs96/ioBroker_twinkly
 * Support:             
 * ----------------------------------------------------
 * Resources:
 *  - Inoffizielle API: https://xled-docs.readthedocs.io/en/latest/index.html
 *  - ioBroker Forum:   https://forum.iobroker.net/topic/38713/twinkly-basisfunktionen-mit-iobroker-steuern
 *  - Code-Hilfe 1:     https://github.com/jschlyter/ttls
 *  - Code-Hilfe 2:     https://github.com/joshkay/home-assistant-twinkly
 * ----------------------------------------------------
 * Change Log:
 *  1.0   patrickbs96   * Initial release
 *******************************************************************************/



/*******************************************************************************
 * Settings
 *******************************************************************************/
const PATH_ID          = 'javascript.0.MyDevices.Twinkly.'; // Pfad für die Datenpunkte
const POLLING_IN_SEK   = 60;                                // Wie oft sollen die Daten abgefragt werden
const EXTENDED_LOGGING = false;                             // Mehr Informationen loggen
const USE_CURL_INSTEAD = false;                             // Sollen die Befehle als curl anstelle vom Request versendet werden.

const devices = {
    Weihnachtsbaum : {                                   // State-Name in ioBroker
        name           : 'Weihnachtsbaum',               // Name für ioBroker (Falls nicht hinterlegt wird der State-Name verwendet)
        ipAdresse      : '192.168.178.53',               // IP-Adresse von der Twinkly-Lichterkette
        connectedState : 'ping.0.Twinkly_Weihnachtsbaum' // State mit true/false der den aktuellen Status der Lichterkette überwacht (bspw. ping, tr-064)
    }
};

function init() {
    let id = '', subscribe = '';

    // Verbindungen anlegen...
    for (let device of Object.keys(devices)) {
        let deviceName = devices[device].name;
        if (isLikeEmpty(deviceName))
            deviceName = device;

        devices[device].connect = new Twinkly(deviceName, devices[device].ipAdresse);

        // Doppelte Ereignisse verhindern...
        devices[device].fetchActive = false;
        devices[device].lastAction  = '';

        // Soll der Ping-Adapter geprüft werden?
        devices[device].checkConnected = !isLikeEmpty(devices[device].connectedState) && isState(devices[device].connectedState, true);

        // Gerät anlegen...
        createChannel(PATH_ID + device, '', false, deviceName);

        // States nur anlegen und Trigger anmelden, wenn eine IP-Adresse hinzugefügt wurde.
        if (devices[device].ipAdresse != '') {

            /*******************************************************************************
             * States anlegen
             *******************************************************************************/
            // Ein-/Ausschalten
            id = PATH_ID + device + '.on';
            subscribe += (subscribe != '' ? '|' : '') + id;
            createState(id, false, false, {name: deviceName + ' eingeschaltet', read: true, write: true, type: 'boolean', role: 'switch'});

            // Mode
            id = PATH_ID + device + '.mode';
            subscribe += (subscribe != '' ? '|' : '') + id;
            createState(id, '', false, {name: deviceName + ' Mode', read: true, write: true, type: 'string', role: 'state', states: MODES_TXT});

            // Beleuchtung
            id = PATH_ID + device + '.bri';
            subscribe += (subscribe != '' ? '|' : '') + id;
            createState(id, 0, false, {name: deviceName + ' Helligkeit', read: true, write: true, type: 'number', role: 'level.dimmer', min: 0, max: 100, def: 0});

            // Name
            id = PATH_ID + device + '.name';
            subscribe += (subscribe != '' ? '|' : '') + id;
            createState(id, '', false, {name: deviceName + ' Name', read: true, write: true, type: 'string', role: 'state'});

            // MQTT
            id = PATH_ID + device + '.mqtt';
            subscribe += (subscribe != '' ? '|' : '') + id;
            createState(id, '', false, {name: deviceName + ' MQTT', read: true, write: true, type: 'string', role: 'state'});

            // Timer
            id = PATH_ID + device + '.timer';
            subscribe += (subscribe != '' ? '|' : '') + id;
            createState(id, '', false, {name: deviceName + ' Timer', read: true, write: true, type: 'string', role: 'state'});

            // Details
            createState(PATH_ID + device + '.details', '', false, {name: deviceName + ' Details', read: true, write: false, type: 'string', role: 'state'});

            // Firmware
            createState(PATH_ID + device + '.firmware', '', false, {name: deviceName + ' Firmware', read: true, write: false, type: 'string', role: 'state'});

            // Verbunden
            createState(PATH_ID + device + '.connected', false, false, {name: deviceName + ' Verbunden', read: true, write: false, type: 'boolean', role: 'indicator.connected'});
            /*******************************************************************************/
        }

        // Trigger anmelden...
        if (subscribe != '') {
            setTimeout(() => {
                on({id: new RegExp(subscribe.replace(/\./g, '\\.')), change: 'ne', ack: false}, function (obj) {
                    let command = obj.id.substring(obj.id.lastIndexOf('.')),
                        device  = obj.id.substring(0, obj.id.lastIndexOf('.'));
                        device  = device.substring(device.lastIndexOf('.')+1);

                    if (!Object.keys(devices).includes(device)) {
                        console.error(`[${device}] Existiert nicht!`);
                        return;
                    }

                    // Nur ausführen, wenn Gerät verbunden ist!
                    if (devices[device].checkConnected && !getState(devices[device].connectedState).val) return;
                    
                    // Doppelte Ereignisse verhindern...
                    let action = 'set:' + command + ':' + obj.state.val;
                    if (devices[device].lastAction == action) return;
                    devices[device].lastAction = action;

                    /*******************************************************************************
                     * Daten ändern
                     *******************************************************************************/
                    // Gerät ein-/ausschalten
                    if (command == '.on') {
                        devices[device].connect.set_mode(obj.state.val ? MODES.on : MODES.off)
                        .catch(error => {console.error(`[${device}.on] ${error}`)});
                    
                    // Mode anpassen
                    } else if (command == '.mode') {
                        devices[device].connect.set_mode(obj.state.val)
                        .catch(error => {console.error(`[${device}.mode] ${error}`)});
                    
                    // Helligkeit anpassen
                    } else if (command == '.bri') {
                        devices[device].connect.set_brightness(obj.state.val)
                        .catch(error => {console.error(`[${device}.bri] ${error}`)});
                    
                    // Namen anpassen
                    } else if (command == '.name') {
                        devices[device].connect.set_name(obj.state.val)
                        .catch(error => {console.error(`[${device}.name] ${error}`)});
                    
                    // MQTT anpassen
                    } else if (command == '.mqtt') {
                        devices[device].connect.set_mqtt_str(obj.state.val)
                        .catch(error => {console.error(`[${device}.mqtt] ${error}`)});
                    
                    // Timer anpassen
                    } else if (command == '.timer') {
                        devices[device].connect.set_mqtt_str(obj.state.val)
                        .catch(error => {console.error(`[${device}.timer] ${error}`)});
                    }
                    /*******************************************************************************/
                });

                // Jede Minute aktuelle Werte abfragen
                getDataInterval = setInterval(async function() {
                    /*******************************************************************************
                     * Daten abfragen
                     *******************************************************************************/
                    for (let device of Object.keys(devices)) {
                        if (devices[device].ipAdresse == '') continue;
                        
                        // Connected abfragen
                        if (devices[device].checkConnected) {
                            let connected = getState(devices[device].connectedState).val;
                            setState(PATH_ID + device + '.connected', connected, true);

                            // Nur ausführen, wenn Gerät verbunden ist!
                            if (!connected) continue;
                        }

                        if (devices[device].fetchActive) continue;
                        // Fetch gestartet und Flag setzen
                        devices[device].fetchActive = true;

                        await devices[device].connect.get_mode()
                        .then(({mode}) => {
                            setState(PATH_ID + device + '.mode', mode, true);
                            setState(PATH_ID + device + '.on',   mode != MODES.off, true);
                        })
                        .catch(error => {console.error(`[${device}.mode] ${error}`)});
                            
                        await devices[device].connect.get_brightness()
                        .then(({value}) => {setState(PATH_ID + device + '.bri', value, true);})
                        .catch(error => {console.error(`[${device}.bri] ${error}`)});

                        await devices[device].connect.get_name()
                        .then(({name}) => {setState(PATH_ID + device + '.name', name, true);})
                        .catch(error => {console.error(`[${device}.name] ${error}`)});

                        await devices[device].connect.get_mqtt()
                        .then(({mqtt}) => {setState(PATH_ID + device + '.mqtt', JSON.stringify(mqtt), true);})
                        .catch(error => {console.error(`[${device}.mqtt] ${error}`)});

                        await devices[device].connect.get_timer()
                        .then(({timer}) => {setState(PATH_ID + device + '.timer', JSON.stringify(timer), true);})
                        .catch(error => {console.error(`[${device}.timer] ${error}`)});

                        await devices[device].connect.get_details()
                        .then(({details}) => {setState(PATH_ID + device + '.details', JSON.stringify(details), true);})
                        .catch(error => {console.error(`[${device}.details] ${error}`)});

                        await devices[device].connect.get_firmware_version()
                        .then(({version}) => {setState(PATH_ID + device + '.firmware', version, true);})
                        .catch(error => {console.error(`[${device}.firmware] ${error}`)});

                        // Fetch abgeschlossen und Flag zurücksetzen
                        devices[device].fetchActive = false;
                    }
                    /*******************************************************************************/
                }, POLLING_IN_SEK * 1_000);
            }, 2_000);
        }
    }
}

class Twinkly {
    
    /**
    * @param {string} name
    * @param {string} host
    */
    constructor(name, host) {
        this.name    = name;
        this.host    = host;
        this.expires = null;
        this.headers = {};
        this.details = {};
        this.token   = '';
        this.challengeResponse = '';
    }

    /** 
     * @return {String} 
     */
    base() {
        return `http://${this.host}/xled/v1`;
    }

    /** 
     * @return {Number} Anzahl LEDs
     */
    length() {
        return Number(this.details['number_of_led'])
    }

    async interview() {
        if (Object.keys(this.details).length == 0)
            this.details = this.get_details();
    }

    /**
     * @param {string} path
     * @param {any} data
     * @param {{}} headers
     * @return {Promise<{}>}
     */
    async _post(path, data, headers = {}) {
        if (Object.keys(headers).length == 0) headers = this.headers;

        logDebug(`[${this.name}._post] <${path}>, ${JSON.stringify(data)}, ${JSON.stringify(headers)}`);

        let result, resultError;
        await this.ensure_token(false).catch(error => {resultError = error;});

        if (!resultError) {        
            // POST ausführen...
            await this._doPOST(path, data, headers).then(response => {result = response;}).catch(error => {resultError = error;});

            if (resultError && String(resultError).includes('Invalid Token')) {
                resultError = null;

                // Token erneuern
                await this.ensure_token(true).catch(error => {resultError = error;});

                // POST erneut ausführen...
                if (!resultError) {
                    await this._doPOST(path, data, headers).then(response => {result = response;}).catch(error => {resultError = error;});
                    
                    // Wenn wieder fehlerhaft, dann Pech gehabt. Token wird gelöscht...
                    if (resultError && String(resultError).includes('Invalid Token'))
                        this.token = '';
                }
            }
        }

        return new Promise((resolve, reject) => {
            if (resultError)
                reject(resultError)
            else {
                resolve(result);
            }
        });
    }

    /**
     * @param {string} path
     * @param {any} data
     * @param {{}} headers
     * @return {Promise<{}>}
     */
    async _doPOST(path, data, headers) {
        return new Promise((resolve, reject) => {
            doPostRequest(this.base() + '/' + path, data, {headers: headers})
            .then(({response, body}) => {
                try {
                    if (body && typeof body === 'object') {
                        let checkTwinklyCode = translateTwinklyCode(this.name, 'POST', path, body.code);
                        if (checkTwinklyCode)
                            console.warn(`${checkTwinklyCode}, Data: ${JSON.stringify(data)}, Headers: ${JSON.stringify(headers)}, Body: ${JSON.stringify(body)}`);
                    }

                    resolve(body);
                } catch (e) {
                    reject(`${e.name}: ${e.message}`);
                }
            })
            .catch(error => {
                reject(error);
            });
        });
    }

    /**
     * @param {string} path
     * @return {Promise<{}>}
     */
    async _get(path) {
        logDebug(`[${this.name}._get] <${path}>`);

        let result, resultError;
        await this.ensure_token(false).catch(error => {resultError = error;});

        if (!resultError) {        
            // GET ausführen...
            await this._doGET(path).then(response => {result = response;}).catch(error => {resultError = error;});

            if (resultError && String(resultError).includes('Invalid Token')) {
                resultError = null;

                // Token erneuern
                await this.ensure_token(true).catch(error => {resultError = error;});

                // GET erneut ausführen...
                if (!resultError) {
                    await this._doGET(path).then(response => {result = response;}).catch(error => {resultError = error;});

                    // Wenn wieder fehlerhaft, dann Pech gehabt. Token wird gelöscht...
                    if (resultError && String(resultError).includes('Invalid Token'))
                        this.token = '';
                }
            }
        }

        return new Promise((resolve, reject) => {
            if (resultError)
                reject(resultError)
            else
                resolve(result);
        });
    }
    
    /**
     * @param {string} path
     * @return {Promise<{}>}
     */
    async _doGET(path) {
        return new Promise((resolve, reject) => {
            doGetRequest(this.base() + '/' + path, {headers: this.headers})
            .then(({response, body}) => {
                try {
                    if (body && typeof body === 'object') {
                        let checkTwinklyCode = translateTwinklyCode(this.name, 'GET', path, body.code);
                        if (checkTwinklyCode)
                            console.warn(`${checkTwinklyCode}, Headers: ${JSON.stringify(this.headers)}, Body: ${JSON.stringify(body)}`);
                    }
                    
                    resolve(body);
                } catch (e) {
                    reject(`${e.name}: ${e.message}`);
                }
            })
            .catch(error => {
                reject(error);
            });
        });
    }
    
    /**
     * Token prüfen ob er bereits abgelaufen ist.
     * @param {boolean} force
     * @return {Promise<String>}
     */
    async ensure_token(force) {
        const TWINKLY_OBJ = this;

        if (force || (TWINKLY_OBJ.token == '' || TWINKLY_OBJ.expires == null || TWINKLY_OBJ.expires <= Date.now())) {
            logDebug(`[${TWINKLY_OBJ.name}.ensure_token] Authentication token expired, will refresh`);

            let resultError;
            await TWINKLY_OBJ.login().catch(error => {resultError = error;});
            if (!resultError)
                await TWINKLY_OBJ.verify_login().catch(error => {resultError = error;});

            return new Promise((resolve, reject) => {
                if (resultError)
                    reject(resultError)
                else
                    resolve(TWINKLY_OBJ.token);
            });
        } else {
            logDebug(`[${TWINKLY_OBJ.name}.ensure_token] Authentication token still valid (${new Date(TWINKLY_OBJ.expires).toLocaleString()})`);
        }
    }

    /**
     * @return {Promise<{authentication_token: String; authentication_token_expires_in: Number; 'challenge-response': String; code: Number; }>} 
     */
    async login() {
        const TWINKLY_OBJ = this;

        this.token = '';
        return new Promise((resolve, reject) => {
            doPostRequest(TWINKLY_OBJ.base() + '/login', {'challenge': 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8='}, null)
            .then(({response, body}) => {
                try {
                    let checkTwinklyCode;
                    if (body && typeof body === 'object')
                        checkTwinklyCode = translateTwinklyCode(TWINKLY_OBJ.name, 'POST', 'login', body.code);

                    if (checkTwinklyCode) {
                        reject(checkTwinklyCode);
                    }
                    else {
                        TWINKLY_OBJ.token                   = body['authentication_token'];
                        TWINKLY_OBJ.headers['X-Auth-Token'] = TWINKLY_OBJ.token;
                        TWINKLY_OBJ.expires                 = Date.now() + (body['authentication_token_expires_in'] * 1000);
                        TWINKLY_OBJ.challengeResponse       = body['challenge-response'];

                        resolve({authentication_token            : body['authentication_token'], 
                                 authentication_token_expires_in : body['authentication_token_expires_in'], 
                                 'challenge-response'            : body['challenge-response'], 
                                 code                            : body['code']});
                    }
                } catch (e) {
                        reject(`${e.name}: ${e.message}, Body: ${JSON.stringify(body)}`);
                }
            })
            .catch(error => {
            	reject(error);
            });
        });
    }

    /**
     * @return {Promise<{code: Number; }>} 
     */
    async logout() {
        if (this.token != '') {
            let resultError;
            const response = await this._post('logout', {}).catch(error => {resultError = error;});
            
            return new Promise((resolve, reject) => {
                if (resultError)
                    reject(resultError)
                else {
                    this.token = '';
                    resolve({code: response['code']});
                }
            });
        }
    }

    /**
     * @return {Promise<{code: Number; }>} 
     */
    async verify_login() {
        let result, resultError;
        if (this.challengeResponse == '') 
            resultError = 'Challenge-Response nicht gefüllt!'
        else {
            const response = await this._post('verify', {'challenge-response': this.challengeResponse}).catch(error => {resultError = error;});
            result = {code: response['code']};
        }
        
        return new Promise((resolve, reject) => {
            if (resultError)
                reject(resultError)
            else
                resolve(result);
        });
    }

    /** 
     * @return {Promise<{name: String; code: Number; }>} 
     */
    async get_name() {
        let resultError;
        const response = await this._get('device_name').catch(error => {resultError = error;});
        
        return new Promise((resolve, reject) => {
            if (resultError)
                reject(resultError)
            else
                resolve({name: response['name'], code: response['code']});
        });
    }

    /**
     * @param {String} name Desired device name. At most 32 characters
     * @return {Promise<{name: String; code: Number; }>} 
     */
    async set_name(name) {
        let resultError;
        const response = await this._post('device_name', {'name': name}).catch(error => {resultError = error;});
        
        return new Promise((resolve, reject) => {
            if (resultError)
                reject(resultError)
            else
                resolve({name: response['name'], code: response['code']});
        });
    }

    /**
     * @return {Promise<{code: Number; }>} 
     */
    async reset() {
        let resultError;
        const response = await this._get('reset').catch(error => {resultError = error;});        
        
        return new Promise((resolve, reject) => {
            if (resultError)
                reject(resultError)
            else
                resolve({code: response['code']});
        });
    }

    /** 
     * @return {Promise<void | {}>} 
     */
    async get_network_status() {
        let resultError;
        const response = await this._get('network/status').catch(error => {resultError = error;});        
        
        return new Promise((resolve, reject) => {
            if (resultError)
                reject(resultError)
            else
                resolve(response) //{code: response['code']});
        });
    }

    /** 
     * 
     */
    async set_network_status() {
        // const response = await this._post('network/status', );
        // return {code: response['code']};
    }

    /** 
     * @return {Promise<{timer: {time_now: Number; time_on: Number; time_off: Number;}; code: Number; }>} 
     */
    async get_timer() {
        let resultError;
        const response = await this._get('timer').catch(error => {resultError = error;});        
        
        return new Promise((resolve, reject) => {
            if (resultError)
                reject(resultError)
            else
                resolve({timer: {time_now: response['time_now'], time_on: response['time_on'], time_off: response['time_off']}, code: response['code']});
        });
    }

    /**
     * @param {Number} time_now current time in seconds after midnight
     * @param {Number} time_on  time when to turn lights on in seconds after midnight.  -1 if not set
     * @param {Number} time_off time when to turn lights off in seconds after midnight. -1 if not set
     * @return {Promise<{code: Number;}>}
     */
    async set_timer(time_now, time_on, time_off) {
        let resultError;
        const response = await this._post('timer', {'time_now': time_now, 'time_on': time_on, 'time_off': time_off}).catch(error => {resultError = error;});        
        
        return new Promise((resolve, reject) => {
            if (resultError)
                reject(resultError)
            else
                resolve({code: response['code']});
        });
    }

    /**
    * @param {string} data
    */
    async set_timer_str(data) {
        try {
            let json = JSON.parse(data);
            
            let resultError;
            const response = await this.set_timer(json.time_now, json.time_on, json.time_off).catch(error => {resultError = error;});
            
            return new Promise((resolve, reject) => {
                if (resultError)
                    reject(resultError)
                else
                    resolve({code: response['code']});
            });
        } catch (e) {
            throw Error(e.message);
        }
    }

    /** 
     * @return {Promise<{version: String; code: Number; }>} 
     */
    async get_firmware_version() {
        let resultError;
        const response = await this._get('fw/version').catch(error => {resultError = error;});        
        
        return new Promise((resolve, reject) => {
            if (resultError)
                reject(resultError)
            else
                resolve({version: response['version'], code: response['code']});
        });
    }

    /** 
     * @return {Promise<{details: {product_name: String; product_version: String; hardware_version: String; flash_size: Number; led_type: Number; 
     *                             led_version: Number; product_code: String; device_name: String; uptime: String; hw_id: String; mac: String; 
     *                             max_supported_led: Number; base_leds_number: Number; number_of_led: Number; led_profile: String; frame_rate: Number;
     *                             movie_capacity: Number; copyright: String;}; 
     *                   code: Number; }>} 
     */
    async get_details() {
        let resultError;
        const response = await this._get('gestalt').catch(error => {resultError = error;});        
        
        return new Promise((resolve, reject) => {
            if (resultError)
                reject(resultError)
            else
                resolve({details: {product_name     : response['product_name'],     product_version : response['product_version'], hardware_version  : response['hardware_version'], 
                          flash_size       : response['flash_size'],       led_type        : response['led_type'],        led_version       : response['led_version'], 
                          product_code     : response['product_code'],     device_name     : response['device_name'],     uptime            : response['uptime'], 
                          hw_id            : response['hw_id'],            mac             : response['mac'],             max_supported_led : response['max_supported_led'], 
                          base_leds_number : response['base_leds_number'], number_of_led   : response['number_of_led'],   led_profile       : response['led_profile'], 
                          frame_rate       : response['frame_rate'],       movie_capacity  : response['movie_capacity'],  copyright         : response['copyright']},
                         code: response['code']});
        });
    }

    /** 
     * @return {Promise<{mode: String; code: Number; }>} 
     */
    async get_mode() {
        let resultError;
        const response = await this._get('led/mode').catch(error => {resultError = error;});        
        
        return new Promise((resolve, reject) => {
            if (resultError)
                reject(resultError)
            else
                resolve({mode: response['mode'], code: response['code']});
        });
    }

    /**
     * @param {String} mode mode of operation
     * @return {Promise<{code: Number; }>} 
     */
    async set_mode(mode) {
        let resultError;
        const response = await this._post('led/mode', {'mode': mode}).catch(error => {resultError = error;});        
        
        return new Promise((resolve, reject) => {
            if (resultError)
                reject(resultError)
            else
                resolve({code: response['code']});
        });
    }

    /** 
     * @return {Promise<{value: Number; enabled: String; code: Number; }>} 
     */
    async get_brightness() {
        let resultError;
        const response = await this._get('led/out/brightness').catch(error => {resultError = error;});        
        
        return new Promise((resolve, reject) => {
            if (resultError)
                reject(resultError)
            else
                resolve({value: response['value'], enabled: response['enabled'], code: response['code']});
        });
    }

    /**
     * @param {Number} brightness brightness level in range of 0..100
     * @return {Promise<{code: Number; }>} 
     */
    async set_brightness(brightness) {
        let resultError;
        const response = await this._post('led/out/brightness', {value: brightness, mode: 'enabled', type: 'A'}).catch(error => {resultError = error;});        
        
        return new Promise((resolve, reject) => {
            if (resultError)
                reject(resultError)
            else
                resolve({code: response['code']});
        });
    }

    /** 
     * @return {Promise<{mqtt: {broker_host: String; 
     *                          broker_port: Number; 
     *                          client_id: String; 
     *                          user: String;
     *                          keep_alive_interval: Number; 
     *                          encryption_key_set: Boolean; }; code: Number; }>} 
     */
    async get_mqtt() {
        let resultError;
        const response = await this._get('mqtt/config').catch(error => {resultError = error;});        
        
        return new Promise((resolve, reject) => {
            if (resultError)
                reject(resultError)
            else
                resolve({mqtt: {broker_host         : response['broker_host'], 
                                broker_port         : response['broker_port'], 
                                client_id           : response['client_id'], 
                                user                : response['user'], 
                                keep_alive_interval : response['keep_alive_interval'], 
                                encryption_key_set  : response['encryption_key_set']},
                         code: response['code']});
        });
    }

    /**
     * @param {String} broker_host hostname of broker
     * @param {Number} broker_port destination port of broker
     * @param {String} client_id
     * @param {String} user
     * @param {String} encryption_key length exactly 16 characters?
     * @param {Number} keep_alive_interval
     * @return {Promise<{code: Number;}>}
     */
    async set_mqtt(broker_host, broker_port, client_id, user, encryption_key, keep_alive_interval) {
        let resultError;
        const response = await this._post('mqtt/config', {broker_host         : broker_host, 
                                                          broker_port         : broker_port, 
                                                          client_id           : client_id, 
                                                          user                : user, 
                                                          encryption_key      : encryption_key, 
                                                          keep_alive_interval : keep_alive_interval}).catch(error => {resultError = error;});        

        return new Promise((resolve, reject) => {
            if (resultError)
                reject(resultError)
            else
                resolve({code: response['code']});
        });
    }

    /**
    * @param {string} data
    */
    async set_mqtt_str(data) {
        try {
            let json = JSON.parse(data);
            
            let resultError;
            const response = await this.set_mqtt(json.broker_host, 
                                                 json.broker_port, 
                                                 json.client_id, 
                                                 json.user, 
                                                 json.encryption_key, 
                                                 json.keep_alive_interval).catch(error => {resultError = error;});
            
            return new Promise((resolve, reject) => {
                if (resultError)
                    reject(resultError)
                else
                    resolve({code: response['code']});
            });
        } catch (e) {
            throw Error(e.message);
        }
    }

    /**
     * @param {{}} movie
     * @return {Promise<{code: Number;}>}
     */
    async upload_movie(movie) {
        let resultError;
        const response = await this._post('led/movie/full', movie, {'Content-Type': 'application/octet-stream', 'X-Auth-Token': this.token}).catch(error => {resultError = error;});        
        
        return new Promise((resolve, reject) => {
            if (resultError)
                reject(resultError)
            else
                resolve({code: response['code']});
        });
    }

    /** 
     * @return {Promise<{response: void | {}; code: Number; }>} 
     */
    async get_movie_config() {
        let resultError;
        const response = await this._get('led/movie/config').catch(error => {resultError = error;});        
        
        return new Promise((resolve, reject) => {
            if (resultError)
                reject(resultError)
            else
                resolve({response, code: response['code']}); // TODO: 
        });
    }

    /**
     * @param {Number} frame_delay
     * @param {Number} leds_number seems to be total number of LEDs to use
     * @param {Number} frames_number
     * @return {Promise<{code: Number;}>}
     */
    async set_movie_config(frame_delay, leds_number, frames_number) {
        let resultError;
        const response = await this._post('led/movie/config', {frame_delay   : frame_delay, 
                                                               leds_number   : leds_number, 
                                                               frames_number : frames_number}).catch(error => {resultError = error;});        
        
        return new Promise((resolve, reject) => {
            if (resultError)
                reject(resultError)
            else
                resolve({code: response['code']});
        });
    }

    // async send_frame(frame) {
        // await this.interview()
        // if (frame.length != this.length()) {
        //     console.error('Invalid frame length');
        //     return;
        // }

        // let token = await this.ensure_token();
        // header = bytes([0x01]) + bytes(base64.b64decode(token)) + bytes([this.length()])
        // payload = []
        // for x in frame:
        //     payload.extend(list(x))
        // this.socket.sendto(header + bytes(payload), (this.host, this.rt_port))
    // }

    // async set_static_colour(colour) {
    //     frame = [colour for _ in range(0, self.length)]
    //     movie = bytes([item for t in frame for item in t])
    //     await this.upload_movie(movie)
    //     await this.set_movie_config(
    //         {
    //             'frames_number': 1,
    //             'loop_type': 0,
    //             'frame_delay': 56,
    //             'leds_number': self.length,
    //         }
    //     )
    //     await self.set_mode(MODES.on)
    // }
}

const 
    MODES = {
        rt       : 'rt', 
        on       : 'movie', 
        off      : 'off',
        playlist : 'playlist',
        demo     : 'demo', 
        effect   : 'effect'},

    MODES_TXT = {
        rt       : 'Real Time', 
        movie    : 'Eingeschaltet', 
        off      : 'Ausgeschaltet', 
        playlist : 'Playlist',
        demo     : 'Demo', 
        effect   : 'Effect'},

    HTTPCodes = {
        ok         : 1000,
        invalid    : 1101,
        error      : 1102,
        errorValue : 1103,
        errorJSON  : 1104,
        invalidKey : 1105,
        errorLogin : 1106},

    HTTPCodes_TXT = {
        1000 : 'OK',
        1101 : 'Invalid argument value',
        1102 : 'Error',
        1103 : 'Error - value too long',
        1104 : 'Error - malformed JSON on input',
        1105 : 'Invalid argument key',
        1106 : 'Error - Login'};


/**
* @param {string} name
* @param {string} mode
* @param {string} path
* @param {number} code
*/
function translateTwinklyCode(name, mode, path, code) {
    if (code != HTTPCodes.ok) 
        return `[${name}.${mode}.${path}] ${code} (${HTTPCodes_TXT[code]})`;
}

/**
* @param {string} message
*/
function logDebug(message) {
    if (EXTENDED_LOGGING) 
        console.log(message)
    else
        console.debug(message);
}

let getDataInterval;
init();


/*******************************************************************************
 * GLOBAL CODE
 *******************************************************************************/
/**
* @param {string} id
* @param {any} initValue
*/
function createChannel(id, initValue, forceCreation = false, name = '', common = {}, native = {}) {
    common.name = name != '' ? name : id;
    
    createState(id, initValue, forceCreation, common, native, state => {
        let obj = getObject(id);
        obj.type = 'channel';
        setObject(id, obj);
    });
}

/**
* @param {string} url
* @param {string | {} } body
* @param {string} method
* @param {function | {} } addOptions
* @return {Promise<{response: any, body: any}>}
*/
function httpRequest(url, body, method, addOptions = null) {
    return new Promise((resolve, reject) => {
        if (url == '') {
            reject(`invalid ${method} URL`);
            return;
        }

        if (body != null && typeof body === 'string') {body = JSON.parse(body);}

        const options = {
            url                : url,
            body               : body,
            method             : method,
            rejectUnauthorized : false,
            timeout            : 3000,
            json               : true
        };

        if (addOptions) {
            // Wenn Funktion, dann diese Aufrufen
            if (typeof addOptions === 'function')
                addOptions(options);
            // Wenn Object, dann auslesen
            else if (typeof addOptions === 'object')
                for (let option of Object.keys(addOptions))
                    options[option] = addOptions[option]
        }
    

        if (!USE_CURL_INSTEAD) {
            logDebug(`[httpRequest.${method}] ${JSON.stringify(options)}`);
            request(options, (error, response, body) => {
                const err = error ? error : (response && response.statusCode !== 200 ? 'HTTP Error ' + response.statusCode : null);
                if (err) 
                    reject(err + ', ' + JSON.stringify(body))
                else
                    resolve({response: response, body: body});
            }).on("error", (e) => {
                reject(e.message);
            });
        } else {
            let data    = method == 'POST'              ? `-d '${JSON.stringify(body)}' ` : '';
            let headers = !isLikeEmpty(options.headers) ? options.headers                 : {};

            // Header zusammenbasteln
            if (!Object.keys(headers).includes('Content-Type')) headers['Content-Type'] = 'application/json';
            let header_str = '';
            for (let key of Object.keys(headers))
                header_str += (header_str != '' ? ' ' : '') + `${key}: ${headers[key]}`;
            if (header_str != '') header_str = `-H '${header_str}'`;

            let curl = `curl ${data}${header_str} ${url}`;
            
            logDebug(`[httpRequest.${method}] ${curl}`);
            try {
                exec(curl, async function (error, body, stderr) {
                    let oBody = isJsonString(body) ? JSON.parse(body) : body;

                    if (error) 
                        reject(error + ', ' + body)
                    else
                        resolve({response: null, body: oBody});
                });
            } catch (e) {
                reject(e.message);
            }
        }
    });
}

/**
* @param {string} url
* @param {function | {} } addOptions
* @return {Promise<{response: any, body: any}>}
*/
function doGetRequest(url, addOptions = null) {
    return new Promise((resolve, reject) => {
        httpRequest(url, null, 'GET', addOptions)
        .then(({response, body}) => {
            if (response) logDebug('[doGetRequest] response: ' + JSON.stringify(response));
            if (body)     logDebug('[doGetRequest] body: '     + JSON.stringify(body));

            resolve({response: response, body: body});
        })
        .catch(error => {
            reject(error);
        });
    });
}

/**
* @param {string} url
* @param {string | {} } body
* @param {function | {} } addOptions
* @return {Promise<{response: any, body: any}>}
*/
function doPostRequest(url, body, addOptions = null) {
    return new Promise((resolve, reject) => {
        httpRequest(url, body, 'POST', addOptions)
        .then(({response, body}) => {
            if (response) logDebug('[doPostRequest] response: ' + JSON.stringify(response));
            if (body)     logDebug('[doPostRequest] body: '     + JSON.stringify(body));

            resolve({response: response, body: body});
        })
        .catch(error => {
            reject(error);
        });
    });
}

/** 
 * Checks if String is a JSON-Object
 * @param {string} str
 */
function isJsonString(str) {
    try {
        let json = JSON.parse(str);
        return (typeof json === 'object');
    } catch (e) {
        return false;
    }
}

/**
* Checks if Array or String is not undefined, null or empty.
* 08-Sep-2019: added check for [ and ] to also catch arrays with empty strings.
* @param {any} inputVar - Input Array or String, Number, etc.
* @param {boolean} onlyUndefined - Prüfung nur ob inputVar existiert
* @return true if it is undefined/null/empty, false if it contains value(s)
Array or String containing just whitespaces or >'< or >"< or >[< or >]< is considered empty
*/
function isLikeEmpty(inputVar, onlyUndefined = false) {
    if (typeof inputVar !== 'undefined' && inputVar !== null) {
        if (!onlyUndefined) {
            let strTemp = JSON.stringify(inputVar);
            strTemp = strTemp.replace(/\s+/g, '');  // remove all whitespaces
            strTemp = strTemp.replace(/\"+/g, '');  // remove all >"<
            strTemp = strTemp.replace(/\'+/g, '');  // remove all >'<
            strTemp = strTemp.replace(/\[+/g, '');  // remove all >[<
            strTemp = strTemp.replace(/\]+/g, '');  // remove all >]<

            return strTemp === '';
        } else {
            return false;
        }
    } else {
        return true;
    }
}

/**
 * Checks if a a given state or part of state is existing.
 * This is a workaround, as getObject() or getState() throw warnings in the log.
 * Set strict to true if the state shall match exactly. If it is false, it will add a wildcard * to the end.
 * See: https://forum.iobroker.net/topic/11354/
 * @param {string}    strStatePath     Input string of state, like 'javascript.0.switches.Osram.Bedroom'
 * @param {boolean}   [strict=false]   Optional: if true, it will work strict, if false, it will add a wildcard * to the end of the string       
 * @return {boolean}                   true if state exists, false if not
 */
function isState(strStatePath, strict) {
    let result = true;
    if (strict) 
        result = existsState(strStatePath)
    else
        result = $('state[id=' + strStatePath + '*]').length > 0;

    console.debug(`[isState] strStatePath=<${strStatePath}, strict=${strict}, result=${result}`);
    return result;
}
/*******************************************************************************/

// Nach Skript-Ende...
onStop(function (callback) {
    // Interval abbrechen
    if (getDataInterval) {
        clearInterval(getDataInterval);
        getDataInterval = null;
    }

    // Alle Verbindungen abmelden...
    for (let device of Object.keys(devices))
        devices[device].connect.logout()
        .catch(error => {console.error(`[onStop.${devices[device].connect.name}] ${error}`)});

    callback();
}, 500);

