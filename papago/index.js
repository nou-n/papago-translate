const axios = require("axios");
const cryptojs = require("crypto-js");
const qs = require("qs");

exports.papago = class papago {
    #key;

    #base64 = {
        _map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
        _reverseMap: null,
        stringify: function ({ words, sigBytes }) {
            const map = this._map;
            const output = [];
            const paddingChar = map.charAt(64);
            let chunk, i, a;
    
            // 3바이트 청크 단위로 반복
            for (i = 0; i < sigBytes; i += 3) {
                chunk = (words[i >>> 2] >>> (24 - (i % 4) * 8) & 0xFF) << 16 |
                        (words[(i + 1) >>> 2] >>> (24 - ((i + 1) % 4) * 8) & 0xFF) << 8 |
                        (words[(i + 2) >>> 2] >>> (24 - ((i + 2) % 4) * 8) & 0xFF);
    
                // 4개의 Base64 문자로 변환
                for (a = 0; a < 4 && i + 0.75 * a < sigBytes; a++) {
                    output.push(map.charAt((chunk >>> (6 * (3 - a))) & 0x3F));
                }
            }
    
            // 필요한 경우 패딩 추가
            while (output.length % 4) {
                output.push(paddingChar);
            }
    
            return output.join('');
        },
        parse: function (input) {
            const map = this._map;
            const length = input.length;
    
            // 역 맵 초기화 (이미 초기화되지 않은 경우)
            if (!this._reverseMap) {
                this._reverseMap = Array.from(map).reduce((acc, char, index) => {
                    acc[char.charCodeAt(0)] = index; // 문자에 대한 인덱스 저장
                    return acc;
                }, []);
            }
            const reverseMap = this._reverseMap;
    
            // 패딩 처리
            const paddingChar = map.charAt(64);
            let effectiveLength = length;
            if (paddingChar) {
                const paddingIndex = input.indexOf(paddingChar);
                if (paddingIndex !== -1) {
                    effectiveLength = paddingIndex; // 패딩 위치를 기준으로 길이 조정
                }
            }
    
            // 결과 배열 초기화
            const output = new Uint32Array((effectiveLength * 3) / 4);
            let byteCount = 0;
    
            // 4개의 Base64 문자를 한 번에 처리
            for (let i = 0; i < effectiveLength; i += 4) {
                const a = reverseMap[input.charCodeAt(i)] || 0;
                const b = reverseMap[input.charCodeAt(i + 1)] || 0;
                const c = reverseMap[input.charCodeAt(i + 2)] || 0;
                const d = reverseMap[input.charCodeAt(i + 3)] || 0;
    
                // 바이트를 조합하여 결과 배열에 저장
                output[byteCount++] = (a << 2) | (b >> 4);
                output[byteCount++] = (b << 4) | (c >> 2);
                output[byteCount++] = (c << 6) | d;
            }
    
            return o.create(output, byteCount); // 원래 데이터 생성 (o.create가 정의되어 있다고 가정)
        }
    };

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
        const jsURL =  "https://papago.naver.com/home."+response.data.split(`<link rel="preload" href="/home.`)[1].split(`.js" as="script"/>`)[0]+".js";
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
}
