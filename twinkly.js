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
const PATH_ID = 'javascript.0.MyDevices.Twinkly.';

const devices = {
    Weihnachtsbaum : {
        name           : 'Weihnachtsbaum',               // Name für ioBroker
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
                        console.error(`[Twinkly.${device}] Existiert nicht!`);
                        return;
                    }

                    // Nur ausführen, wenn Gerät verbunden ist!
                    if (devices[device].checkConnected && !getState(devices[device].connectedState).val) return;

                    /*******************************************************************************
                     * Daten ändern
                     *******************************************************************************/
                    // Gerät ein-/ausschalten
                    if (command == '.on') {
                        devices[device].connect.set_mode(obj.state.val ? MODES.on : MODES.off)
                        .catch(error => {console.error(`[Twinkly.${device}.on] ${error}`)});
                    
                    // Mode anpassen
                    } else if (command == '.mode') {
                        devices[device].connect.set_mode(obj.state.val)
                        .catch(error => {console.error(`[Twinkly.${device}.mode] ${error}`)});
                    
                    // Helligkeit anpassen
                    } else if (command == '.bri') {
                        devices[device].connect.set_brightness(obj.state.val)
                        .catch(error => {console.error(`[Twinkly.${device}.bri] ${error}`)});
                    
                    // Namen anpassen
                    } else if (command == '.name') {
                        devices[device].connect.set_name(obj.state.val)
                        .catch(error => {console.error(`[Twinkly.${device}.name] ${error}`)});
                    
                    // MQTT anpassen
                    } else if (command == '.mqtt') {
                        devices[device].connect.set_mqtt_str(obj.state.val)
                        .catch(error => {console.error(`[Twinkly.${device}.mqtt] ${error}`)});
                    
                    // Timer anpassen
                    } else if (command == '.timer') {
                        devices[device].connect.set_mqtt_str(obj.state.val)
                        .catch(error => {console.error(`[Twinkly.${device}.timer] ${error}`)});
                    }
                    /*******************************************************************************/
                });

                // Jede Minute aktuelle Werte abfragen
                schedule('* * * * *', async function() {
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

                        await devices[device].connect.get_mode()
                        .then(({mode}) => {
                            setState(PATH_ID + device + '.mode', mode, true);
                            setState(PATH_ID + device + '.on',   mode != MODES.off, true);
                        })
                        .catch(error => {console.error(`[Twinkly.${device}.on] ${error}`)});
                            
                        await devices[device].connect.get_brightness()
                        .then(({value}) => {setState(PATH_ID + device + '.bri', value, true);})
                        .catch(error => {console.error(`[Twinkly.${device}.bri] ${error}`)});

                        await devices[device].connect.get_name()
                        .then(({name}) => {setState(PATH_ID + device + '.name', name, true);})
                        .catch(error => {console.error(`[Twinkly.${device}.name] ${error}`)});

                        await devices[device].connect.get_mqtt()
                        .then(({mqtt}) => {setState(PATH_ID + device + '.mqtt', JSON.stringify(mqtt), true);})
                        .catch(error => {console.error(`[Twinkly.${device}.mqtt] ${error}`)});

                        await devices[device].connect.get_timer()
                        .then(({timer}) => {setState(PATH_ID + device + '.timer', JSON.stringify(timer), true);})
                        .catch(error => {console.error(`[Twinkly.${device}.timer] ${error}`)});

                        await devices[device].connect.get_details()
                        .then(({details}) => {setState(PATH_ID + device + '.details', JSON.stringify(details), true);})
                        .catch(error => {console.error(`[Twinkly.${device}.details] ${error}`)});

                        await devices[device].connect.get_firmware_version()
                        .then(({version}) => {setState(PATH_ID + device + '.firmware', version, true);})
                        .catch(error => {console.error(`[Twinkly.${device}.firmware] ${error}`)});
                    }
                    /*******************************************************************************/
                });
            }, 2000);
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
    * @return {Promise<{}>} 
    */
    async _post(path, data, headers = {}) {
        console.debug(`[Twinkly.${this.name}._post] <${path}> ${JSON.stringify(data)}`);

        if (Object.keys(headers).length == 0) headers = this.headers;

        await this.ensure_token().catch(error => {throw Error(error);});
        
        return new Promise((resolve, reject) => {
            // exec(`curl -d '${JSON.stringify(data)}' -H 'Content-Type: application/json X-Auth-Token: ${this.token}'  ${this.base() + '/' + path}`, (error, response, body) => {
            doPostRequest(this.base() + '/' + path, data, {headers: headers})
            .then(({response, body}) => {
                try {
                    if (!translateTwinklyCode('POST', path, body.code)) {
                        console.warn(JSON.stringify(body));
                        reject(body.code + ': ' + HTTPCodes_TXT[body.code]);
                    } else
                        resolve(body);
                } catch (e) {
                    reject(e.name + ': ' + e.message);
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
        console.debug(`[Twinkly.${this.name}._get] <${path}>`);

        await this.ensure_token().catch(error => {throw Error(error);});

        return new Promise((resolve, reject) => {
            // exec(`curl -H 'Content-Type: application/json X-Auth-Token: ${this.token}'  ${this.base() + '/' + path}`, (error, response, body) => {
            doGetRequest(this.base() + '/' + path, {headers: this.headers})
            .then(({response, body}) => {
                try {
                    if (!translateTwinklyCode('GET', path, body.code)) {
                        reject(body.code + ': ' + HTTPCodes_TXT[body.code]);
                        console.warn(JSON.stringify(body));
                    } else
                        resolve(body);
                } catch (e) {
                    reject(e.name + ': ' + e.message);
                }
            })
            .catch(error => {
                reject(error);
            });
        });
    }
    
    /** Token prüfen ob er bereits abgelaufen ist.
     * @return {Promise<String>}
     */
    async ensure_token() {
        const TWINKLY_OBJ = this;

        try {
            if (TWINKLY_OBJ.token == '' || TWINKLY_OBJ.expires == null || TWINKLY_OBJ.expires <= Date.now()) {
                console.debug(`[Twinkly.${TWINKLY_OBJ.name}.ensure_token] Authentication token expired, will refresh`);
                await TWINKLY_OBJ.login()
                .catch(error => {
                    throw Error(error);
                });
                TWINKLY_OBJ.verify_login()
                .catch(error => {
                    throw Error(error);
                });

                return TWINKLY_OBJ.token;
            } else
                console.debug(`[Twinkly.${TWINKLY_OBJ.name}.ensure_token] Authentication token still valid`);
        } catch (e) {
            throw Error(e.message);
        }
    }

    /**
     * @return {Promise<{authentication_token: String; authentication_token_expires_in: Number; 'challenge-response': String; code: Number; }>} 
     */
    async login() {
        const TWINKLY_OBJ = this;

        this.token = '';
        return new Promise((resolve, reject) => {
            // exec(`curl -d '${JSON.stringify({'challenge': 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8='})}' -H 'Content-Type: application/json'  ${this.base() + '/login'}`, (error, response, body) => {
            doPostRequest(TWINKLY_OBJ.base() + '/login', {'challenge': 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8='}, null)
            .then(({response, body}) => {
                try {
                    if (!translateTwinklyCode('POST', '/login', body.code)) {
                        reject(body.code + ': ' + HTTPCodes_TXT[body.code]);
                        console.warn(JSON.stringify(body));
                    } else {
                        TWINKLY_OBJ.token                   = body['authentication_token'];
                        TWINKLY_OBJ.headers['X-Auth-Token'] = TWINKLY_OBJ.token;
                        TWINKLY_OBJ.expires                 = Date.now() + body['authentication_token_expires_in'];
                        TWINKLY_OBJ.challengeResponse       = body['challenge-response'];

                        resolve({authentication_token            : body['authentication_token'], 
                                authentication_token_expires_in : body['authentication_token_expires_in'], 
                                'challenge-response'            : body['challenge-response'], 
                                code                            : body['code']});
                    }
                } catch (e) {
                    reject(e.name + ': ' + e.message);
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
            const response = await this._post('logout', {}).catch(error => {throw Error(error)});
            this.token = '';

            return {code: response['code']};
        }
    }

    /**
     * @return {Promise<{code: Number; }>} 
     */
    async verify_login() {
        if (this.challengeResponse != '') {
            const response = await this._post('verify', {'challenge-response': this.challengeResponse}).catch(error => {throw Error(error)});
            return {code: response['code']};
        } else {
            throw Error('Challenge-Response nicht gefüllt!');
        }
    }

    /** 
     * @return {Promise<{name: String; code: Number; }>} 
     */
    async get_name() {
        const response = await this._get('device_name').catch(error => {throw Error(error)});
        return {name: response['name'], code: response['code']};
    }

    /**
     * @param {String} name Desired device name. At most 32 characters
     * @return {Promise<{name: String; code: Number; }>} 
     */
    async set_name(name) {
        const response = await this._post('device_name', {'name': name}).catch(error => {throw Error(error)});
        return {name: response['name'], code: response['code']};
    }

    /**
     * @return {Promise<{code: Number; }>} 
     */
    async reset() {
        const response = await this._get('reset').catch(error => {throw Error(error)});
        return {code: response['code']};
    }

    /** 
     * @return {Promise<{}>} 
     */
    async get_network_status() {
        const response = await this._get('network/status').catch(error => {throw Error(error)});
        return response; //{ code: response['code']};
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
        const response = await this._get('timer').catch(error => {throw Error(error)});
        return {timer: {time_now: response['time_now'], time_on: response['time_on'], time_off: response['time_off']}, code: response['code']};
    }

    /**
     * @param {Number} time_now current time in seconds after midnight
     * @param {Number} time_on  time when to turn lights on in seconds after midnight.  -1 if not set
     * @param {Number} time_off time when to turn lights off in seconds after midnight. -1 if not set
     * @return {Promise<{code: Number;}>}
     */
    async set_timer(time_now, time_on, time_off) {
        const response = await this._post('timer', {'time_now': time_now, 'time_on': time_on, 'time_off': time_off}).catch(error => {throw Error(error)});
        return {code: response['code']};
    }

    /**
    * @param {string} data
    */
    async set_timer_str(data) {
        try {
            let json = JSON.parse(data);
            return await this.set_timer(json.time_now, json.time_on, json.time_off).catch(error => {throw Error(error)});
        } catch (e) {
            throw Error(e.message);
        }
    }

    /** 
     * @return {Promise<{version: String; code: Number; }>} 
     */
    async get_firmware_version() {
        const response = await this._get('fw/version').catch(error => {throw Error(error)});
        return {version: response['version'], code: response['code']};
    }

    /** 
     * @return {Promise<{details: {product_name: String; product_version: String; hardware_version: String; flash_size: Number; led_type: Number; 
     *                             led_version: Number; product_code: String; device_name: String; uptime: String; hw_id: String; mac: String; 
     *                             max_supported_led: Number; base_leds_number: Number; number_of_led: Number; led_profile: String; frame_rate: Number;
     *                             movie_capacity: Number; copyright: String;}; 
     *                   code: Number; }>} 
     */
    async get_details() {
        const response = await this._get('gestalt').catch(error => {throw Error(error)});
        return {details: {product_name     : response['product_name'],     product_version : response['product_version'], hardware_version  : response['hardware_version'], 
                          flash_size       : response['flash_size'],       led_type        : response['led_type'],        led_version       : response['led_version'], 
                          product_code     : response['product_code'],     device_name     : response['device_name'],     uptime            : response['uptime'], 
                          hw_id            : response['hw_id'],            mac             : response['mac'],             max_supported_led : response['max_supported_led'], 
                          base_leds_number : response['base_leds_number'], number_of_led   : response['number_of_led'],   led_profile       : response['led_profile'], 
                          frame_rate       : response['frame_rate'],       movie_capacity  : response['movie_capacity'],  copyright         : response['copyright']},
                code : response['code']};
    }

    /** 
     * @return {Promise<{mode: String; code: Number; }>} 
     */
    async get_mode() {
        const response = await this._get('led/mode').catch(error => {throw Error(error)});
        return {mode: response['mode'], code: response['code']};
    }

    /**
     * @param {String} mode mode of operation
     * @return {Promise<{code: Number; }>} 
     */
    async set_mode(mode) {
        const response = await this._post('led/mode', {'mode': mode}).catch(error => {throw Error(error)});
        return {code: response['code']};
    }

    /** 
     * @return {Promise<{value: Number; enabled: String; code: Number; }>} 
     */
    async get_brightness() {
        const response = await this._get('led/out/brightness').catch(error => {throw Error(error)});
        return {value: response['value'], enabled: response['enabled'], code: response['code']};
    }

    /**
     * @param {Number} brightness brightness level in range of 0..100
     * @return {Promise<{code: Number; }>} 
     */
    async set_brightness(brightness) {
        const response = await this._post('led/out/brightness', {value: brightness, mode: 'enabled', type: 'A'}).catch(error => {throw Error(error)});
        return {code: response['code']};
    }

    /** 
     * @return {Promise<{mqtt: {broker_host: String; broker_port: Number; client_id: String; encryption_key_set: Boolean; keep_alive_interval: Number; user: String; }; code: Number; }>} 
     */
    async get_mqtt() {
        const response = await this._get('mqtt/config').catch(error => {throw Error(error)});
        return {mqtt: {broker_host         : response['broker_host'], 
                       broker_port         : response['broker_port'], 
                       client_id           : response['client_id'], 
                       encryption_key_set  : response['encryption_key_set'], 
                       keep_alive_interval : response['keep_alive_interval'], 
                       user                : response['user']},
                code: response['code']};
    }

    /**
     * @param {String} broker_host hostname of broker
     * @param {Number} broker_port destination port of broker
     * @param {String} client_id
     * @param {String} encryption_key length exactly 16 characters?
     * @param {Number} keep_alive_interval
     * @param {String} user
     * @return {Promise<{code: Number;}>}
     */
    async set_mqtt(broker_host, broker_port, client_id, encryption_key, keep_alive_interval, user) {
        const response = await this._post('mqtt/config', {broker_host         : broker_host, 
                                                          broker_port         : broker_port, 
                                                          client_id           : client_id, 
                                                          encryption_key      : encryption_key, 
                                                          keep_alive_interval : keep_alive_interval, 
                                                          user                : user}).catch(error => {throw Error(error)});
        return {code: response['code']};
    }

    /**
    * @param {string} data
    */
    async set_mqtt_str(data) {
        try {
            let json = JSON.parse(data);
            return await this.set_mqtt(json.broker_host, json.broker_port, json.client_id, json.encryption_key, json.keep_alive_interval, json.user)
                              .catch(error => {throw Error(error)});
        } catch (e) {
            throw Error(e.message);
        }
    }

    /**
     * @param {{}} movie
     * @return {Promise<{code: Number;}>}
     */
    async upload_movie(movie) {
        const response = await this._post('led/movie/full', movie, {'Content-Type': 'application/octet-stream', 'X-Auth-Token': this.token}).catch(error => {throw Error(error)});
        return {code: response['code']};
    }

    /** 
     * @return {Promise<{response: {}; code: Number; }>} 
     */
    async get_movie_config() {
        const response = await this._get('led/movie/config').catch(error => {throw Error(error)});
        return {response, code: response['code']}; // TODO: 
    }

    /**
     * @param {Number} frame_delay
     * @param {Number} leds_number seems to be total number of LEDs to use
     * @param {Number} frames_number
     * @return {Promise<{code: Number;}>}
     */
    async set_movie_config(frame_delay, leds_number, frames_number) {
        const response = await this._post('led/movie/config', {frame_delay: frame_delay, leds_number: leds_number, frames_number: frames_number}).catch(error => {throw Error(error)});
        return {code: response['code']};
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
    //     await self.set_mode('movie')
    // }
}

const 
    MODES = {
        rt     : 'rt', 
        on     : 'movie', 
        off    : 'off', 
        demo   : 'demo', 
        effect : 'effect'},

    MODES_TXT = {
        rt     : 'Real Time', 
        movie  : 'Eingeschaltet', 
        off    : 'Ausgeschaltet', 
        demo   : 'Demo', 
        effect : 'Effect'},

    HTTPCodes = {
        ok         : 1000,
        invalid    : 1101,
        error      : 1102,
        errorValue : 1103,
        errorJSON  : 1104,
        invalidKey : 1105},

    HTTPCodes_TXT = {
        1000 : 'OK',
        1101 : 'Invalid argument value',
        1102 : 'Error',
        1103 : 'Error - value too long',
        1104 : 'Error - malformed JSON on input',
        1105 : 'Invalid argument key'};


function translateTwinklyCode(mode, path, code) {
    if (code != HTTPCodes.ok) {
        console.warn(`${mode}: ${path} - ${code} (${HTTPCodes_TXT[code]})`);
        return false;
    } else 
        return true;
}

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
    
        console.debug(`[httpRequest.${method}] ${JSON.stringify(options)}`);
        request(options, function (error, response, body) {
            const err = error ? error : (response && response.statusCode !== 200 ? 'HTTP Error ' + response.statusCode : null)
            if (err) reject(err);

            resolve({response: response, body: body});
        }).on("error", (e) => {
            reject(e.message);
        });
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
            if (response) console.debug('[doGetRequest] response: ' + JSON.stringify(response));
            if (body)     console.debug('[doGetRequest] body: '     + JSON.stringify(body));

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
            if (response) console.debug('[doPostRequest] response: ' + JSON.stringify(response));
            if (body)     console.debug('[doPostRequest] body: '     + JSON.stringify(body));

            resolve({response: response, body: body});
        })
        .catch(error => {
            reject(error);
        });
    });
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


// Alle Verbindungen abmelden...
onStop(function (callback) {
    for (let device of Object.keys(devices))
        devices[device].connect.logout()
        .catch(error => {console.error(`[onStop] ${error}`)});

    callback();
}, 500);

