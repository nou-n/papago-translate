# papago-translate
API 키 없이 파파고 번역 및 언어 감지 API를 사용할 수 있습니다.

## 기능

<details><summary><h3>1️⃣ 번역</h3></summary>

```js
const { papago } = require("./papago");
(async () => {
    const client = new papago();
    let translated = await client.translate({text: "Ravi de vous rencontrer.", to: "ko"});
    console.log(translated.translatedText); // 만나서 반가워요.
})();
```
</details>

<details><summary><h3>2️⃣ 언어 감지</h3></summary>

```js
const { papago } = require("./papago");
(async () => {
    const client = new papago();
    let langCode = await client.detect({text: "Ravi de vous rencontrer."});
    console.log(langCode); // fr
})();
```
</details>

<details><summary><h3>3️⃣ TTS</h3></summary>

```js
const { papago } = require("./papago");
const axios = require("axios");
const fs = require("fs");
(async () => {
    const client = new papago();
    let url = await client.tts({text: "Ravi de vous rencontrer."});
    console.log(url); // https://papago.naver.com/apis/tts/...
    let tts = await axios.get(url, {responseType: "arraybuffer"});
    fs.writeFileSync("./tts.mp3", tts.data);
})();
```
</details>

## 사용 예시

<details open><summary><h3>코드</h3></summary>
    
```js
const { papago } = require("./papago");

(async () => {
    const client = new papago();
    let translated = await client.translate({text: "Ravi de vous rencontrer.", to: "ko"});
    console.log(`번역된 텍스트: ${translated.translatedText}\n`);
    console.log(" - 사전 -");
    for(let item of translated.dict.items) {
        let word = item.entry.slice(3,-4);
        console.log(word);
        for(let e of item.pos) {
            console.log(` - ${e.type}`);
            for(let [i, f] of e.meanings.entries()) {
                console.log(`   의미 ${i+1}: ${f.meaning}`);
            }
        }
    }
})();
```
</details>

<details open><summary><h3>출력</h3></summary>

```
번역된 텍스트: 만나서 반가워요.

 - 사전 -
ravir
 - 타동사
   의미 1: [문어] 빼앗다, 강탈하다,겁탈하다,유괴하다 (=arracher, enlever, séduire, kidnapper)
   의미 2: (의) 넋을 빼앗다, 황홀하게 하다 (=enchanter)
   의미 3: [종교] 천국으로 데려가다
vous
 - 인칭대명사
   의미 1: (주어) 당신(들)은[이], 너희들은[이]
   의미 2: (직접목적보어) 당신(들)을, 너희들을
 - 남성형 명사
   의미 1: 당신(들)(이라는 말), (=vouvoiement,), (↔tutoiement)
rencontrer
 - 타동사
   의미 1: (우연히) 만나다, 마주치다
   의미 2: (약속하여) 만나다,회견하다
 - 대명동사
   의미 1: 서로 만나다,서로 알게 되다,회견하다
   의미 2: [비유] 서로 (생각·감정이) 일치하다
```
</details>
