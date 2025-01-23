const axios = require("axios");
const cryptojs = require("crypto-js");
const qs = require("qs");

exports.papago = class papago {
    #key;

    #base64 = {
        stringify: function(input) {
            const words = input.words;
            const sigBytes = input.sigBytes;
            const map = this._map;
    
            input.clamp();
    
            const output = [];
            for (let i = 0; i < sigBytes; i += 3) {
                const chunk = 
                    ((words[i >>> 2] >>> (24 - (i % 4) * 8) & 255) << 16) |
                    ((words[(i + 1) >>> 2] >>> (24 - ((i + 1) % 4) * 8) & 255) << 8) |
                    (words[(i + 2) >>> 2] >>> (24 - ((i + 2) % 4) * 8) & 255);
    
                for (let a = 0; a < 4 && i + 0.75 * a < sigBytes; a++) {
                    output.push(map.charAt((chunk >>> (6 * (3 - a))) & 63));
                }
            }
    
            const paddingChar = map.charAt(64);
            if (paddingChar) {
                while (output.length % 4) {
                    output.push(paddingChar);
                }
            }
    
            return output.join("");
        },
        parse: function(input) {
            let length = input.length;
            const map = this._map;
            let reverseMap = this._reverseMap;
    
            if (!reverseMap) {
                reverseMap = this._reverseMap = [];
                for (let i = 0; i < map.length; i++) {
                    reverseMap[map.charCodeAt(i)] = i;
                }
            }
    
            const paddingChar = map.charAt(64);
            if (paddingChar) {
                const paddingIndex = input.indexOf(paddingChar);
                if (paddingIndex !== -1) {
                    length = paddingIndex;
                }
            }
    
            return (function(encodedString, length, reverseMap) {
                const result = [];
                let index = 0;
    
                for (let i = 0; i < length; i++) {
                    if (i % 4) {
                        const a = reverseMap[encodedString.charCodeAt(i - 1)] << (i % 4 * 2);
                        const b = reverseMap[encodedString.charCodeAt(i)] >>> (6 - (i % 4 * 2));
                        const combined = a | b;
    
                        result[index >>> 2] |= combined << (24 - index % 4 * 8);
                        index++;
                    }
                }
    
                return o.create(result, index);
            })(input, length, reverseMap);
        },
        _map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
    };

    #speakers = {
        ko: {
            male: "jinho",
            female: "kyuri"
        },
        en: {
            male: "matt",
            female: "clara"
        },
        es: {
            male: "jose",
            female: "carmen"
        },
        fr: {
            male: "louis",
            female: "roxane"
        },
        ja: {
            male: "shinji",
            female: "yuri"
        },
        ru: {
            male: "aleksei",
            female: "vera"
        },
        th: {
            male: "sarawut",
            female: "somsi"
        },
        "zh-CN": {
            male: "liangliang",
            female: "meimei"
        },
        "zh-TW": {
            male: "kuanlin",
            female: "chiahua"
        }
    }

    /**
     * 랜덤한 UUID를 반환합니다.
     */
    #getUUID() {
        let timestamp = Date.now();
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (function(e) {
            let t = (timestamp + 16 * Math.random()) % 16 | 0;
            return timestamp = Math.floor(timestamp / 16),
            ("x" === e ? t : 3 & t | 8).toString(16)
        }));
    }

    /**
     * Authorization 토큰을 생성하는 데 필요한 키를 설정합니다.
     */
    async #setAuthorizationKey() {
        const response = await axios.get("https://papago.naver.com/", {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
            }
        });
        const jsURL =  "https://papago.naver.com/vendors~home."+response.data.split(`<link rel="preload" href="/vendors~home.`)[1].split(`.js" as="script"/>`)[0]+".js";
        const jsResponse = await axios.get(jsURL, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
            }
        });
        this.#key = jsResponse.data.replaceAll(" ", "").split("AUTH_KEY:\"")[1].split("\"")[0];
    }

    /**
     * 파파고 요청에 사용되는 Authorization 토큰을 생성합니다.
     * 
     * @param {string} url 요청 url
     */
    async #getAuthorization(url) {
        this.#key ?? await this.#setAuthorizationKey();
        const uuid = this.#getUUID(), timestamp = Date.now();
        const token = `PPG ${uuid}:${cryptojs.HmacMD5(`${uuid}\n${url}\n${timestamp}`, this.#key).toString(this.#base64)}`;
        return [uuid, timestamp, token];
    }

    /**
     * 파파고 번역
     * 
     * @param {Object} param
     * @param {string} param.text 번역할 텍스트
     * @param {string} param.to 어느 언어로 번역할지
     * @param {string} param.from 번역할 텍스트의 언어
     */
    async translate({ text, to, from }) {
        from = from ?? await this.detect({ text });
        const translate_token = await this.#getAuthorization("https://papago.naver.com/apis/n2mt/translate");
        const data = await axios.post("https://papago.naver.com/apis/n2mt/translate", qs.stringify({
            deviceId: translate_token[0],
            locale: "ko",
            dict: "true",
            dictDisplay: 30,
            honorific: "true",
            instant: "false",
            paging: "false",
            source: from,
            target: to,
            text,
            usageAgreed: "false"
        }), {
            headers: {
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Accept-Language": "ko",
                "Authorization": translate_token[2],
                "Cache-Control": "no-cache",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Device-Type": "pc",
                "Origin": "https://papago.naver.com",
                "Pragma": "no-cache",
                "Priority": "u=1, i",
                "Referer": "https://papago.naver.com/",
                "Sec-Ch-Ua": "\"Not/A)Brand\";v=\"8\", \"Chromium\";v=\"126\", \"Google Chrome\";v=\"126\"",
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": "\"Windows\"",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "Timestamp": translate_token[1],
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
                "X-Apigw-Partnerid": "papago"
            }
        }).then((response) => response.data);
        return data;
    }
    
    /**
     * 파파고 언어 감지
     * 
     * @param {Object} param
     * @param {string} param.text 감지할 텍스트
     */
    async detect({ text }) {
        const dect_token = await this.#getAuthorization("https://papago.naver.com/apis/langs/dect");
        const langCode = await axios.post("https://papago.naver.com/apis/langs/dect", qs.stringify({query: text}), {
            headers: {
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Accept-Language": "ko",
                "Authorization": dect_token[2],
                "Cache-Control": "no-cache",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Device-Type": "pc",
                "Origin": "https://papago.naver.com",
                "Pragma": "no-cache",
                "Priority": "u=1, i",
                "Referer": "https://papago.naver.com/",
                "Sec-Ch-Ua": "\"Not/A)Brand\";v=\"8\", \"Chromium\";v=\"126\", \"Google Chrome\";v=\"126\"",
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": "\"Windows\"",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "Timestamp": dect_token[1],
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
            }
        }).then((response) => response.data.langCode);
        return langCode;
    }

    /**
     * TTS 음성 파일 URL을 가져옵니다.
     * 
     * @param {Object} param
     * @param {string} param.text TTS 텍스트
     * @param {number} [param.pitch=0] 목소리의 높낮이
     * @param {number} [param.speed=0] 목소리의 속도
     * @param {string} [param.gender="female"] 목소리의 성별
     */
    async tts({ text, pitch = 0, speed = 0, gender = "female" }) {
        const langCode = await this.detect({ text });
        if(!Object.keys(this.#speakers).includes(langCode)) return false;
        const speaker = this.#speakers[langCode][gender];
        const tts_token = await this.#getAuthorization("https://papago.naver.com/apis/tts/makeID");
        const id = await axios.post("https://papago.naver.com/apis/tts/makeID", qs.stringify({
            alpha: 0,
            pitch,
            speaker,
            speed,
            text
        }), {
            headers: {
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Accept-Language": "ko",
                "Authorization": tts_token[2],
                "Cache-Control": "no-cache",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Origin": "https://papago.naver.com",
                "Pragma": "no-cache",
                "Priority": "u=1, i",
                "Referer": "https://papago.naver.com/",
                "Sec-Ch-Ua": "\"Not/A)Brand\";v=\"8\", \"Chromium\";v=\"126\", \"Google Chrome\";v=\"126\"",
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": "\"Windows\"",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "Timestamp": tts_token[1],
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
            }
        });
        return `https://papago.naver.com/apis/tts/${id.data.id}`;
    }
}
