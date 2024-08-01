const axios = require("axios");
const cryptojs = require("crypto-js");
const qs = require("qs");

exports.papago = class papago {
    #key;
    
    #base64 = {
        stringify: function(e) {
            var t = e.words
              , r = e.sigBytes
              , n = this._map;
            e.clamp();
            for (var o = [], i = 0; i < r; i += 3)
                for (var s = (t[i >>> 2] >>> 24 - i % 4 * 8 & 255) << 16 | (t[i + 1 >>> 2] >>> 24 - (i + 1) % 4 * 8 & 255) << 8 | t[i + 2 >>> 2] >>> 24 - (i + 2) % 4 * 8 & 255, a = 0; a < 4 && i + .75 * a < r; a++)
                    o.push(n.charAt(s >>> 6 * (3 - a) & 63));
            var u = n.charAt(64);
            if (u)
                for (; o.length % 4; )
                    o.push(u);
            return o.join("")
        },
        parse: function(e) {
            var t = e.length
              , r = this._map
              , n = this._reverseMap;
            if (!n) {
                n = this._reverseMap = [];
                for (var i = 0; i < r.length; i++)
                    n[r.charCodeAt(i)] = i
            }
            var s = r.charAt(64);
            if (s) {
                var a = e.indexOf(s);
                -1 !== a && (t = a)
            }
            return function(e, t, r) {
                for (var n = [], i = 0, s = 0; s < t; s++)
                    if (s % 4) {
                        var a = r[e.charCodeAt(s - 1)] << s % 4 * 2
                          , u = r[e.charCodeAt(s)] >>> 6 - s % 4 * 2
                          , c = a | u;
                        n[i >>> 2] |= c << 24 - i % 4 * 8,
                        i++
                    }
                return o.create(n, i)
            }(e, t, n)
        },
        _map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
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
     * 파파고 요청에 사용되는 Authorization 토큰을 가져옵니다.
     * 
     * @param {string} url 요청 url
     */
    async #getAuthorization(url) {
        if(!this.#key) {
            let js_url = await axios.get("https://papago.naver.com/", {
                headers: {
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "Accept-Encoding": "gzip, deflate, br, zstd",
                    "Accept-Language": "ko-KR,ko;q=0.9",
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache",
                    "Priority": "u=0, i",
                    "Sec-Ch-Ua": "\"Not/A)Brand\";v=\"8\", \"Chromium\";v=\"126\", \"Google Chrome\";v=\"126\"",
                    "Sec-Ch-Ua-Mobile": "?0",
                    "Sec-Ch-Ua-Platform": "\"Windows\"",
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "none",
                    "Sec-Fetch-User": "?1",
                    "Upgrade-Insecure-Requests": "1",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
                }
            }).then((response) => {
                let html = response.data;
                return "https://papago.naver.com/home."+html.split(`<link rel="preload" href="/home.`)[1].split(`.js" as="script"/>`)[0]+".js";
            });
            this.#key = await axios.get(js_url, {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
            }).then((response) => {
                let js = response.data.replaceAll(" ", "");
                return js.split(`AUTH_KEY:"`)[1].split(`"`)[0];
            });
        }
        let uuid_ = this.#getUUID(), timestamp = Date.now();
        let token = `PPG ${uuid_}:${cryptojs.HmacMD5(`${uuid_}\n${url}\n${timestamp}`, this.#key).toString(this.#base64)}`;
        return [uuid_, timestamp, token];
    }

    /**
     * 파파고 번역
     * 
     * @param {string} text 번역할 텍스트
     * @param {string} to 어느 언어로 번역할지
     * @param {string=} from 번역할 텍스트의 언어
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
     * @param {string} text 감지할 텍스트
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
