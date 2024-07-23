const { papago } = require("./papago");

async function main() {
    const client = new papago();
    let translated = await client.translate({text: "Ravi de vous rencontrer.", to: "ko"});
    console.log(translated.translatedText); // 만나서 반가워요.
}

main();