/*
Features 
translateText => translate one text
listAvailableLanguages => fetch all available languages
generateLocalizableStrings => translate entire strings.localizable
*/

const fs = require("fs");
const readLine = require("readline");

// Imports the Google Cloud client library
const { Translate } = require("@google-cloud/translate").v2;

// global variable
let googleAPI;

const config = {
  googleApiCredential: "",
  googleApiProjectId: "",
  log: true,
};

function configure(configObj) {
  config.googleApiCredential = configObj["googleApiCredential"];
  config.googleApiProjectId = configObj["googleApiProjectId"];
  config.log = configObj["log"];
  googleAPI = new Translate({
    credentials: config.googleApiCredential,
    projectId: config.googleApiProjectId,
  });
}

function validate() {
  if (!config.googleApiCredential) {
    throw new Error("Must provided Google API Credential");
  }
  if (!config.googleApiProjectId) {
    throw new Error("Must provided Google API projectId");
  }
}

// first argument: "text"
// second argument:
// example {from: "ko", to: "en"}
async function translate(text, translateObj) {
  validate();
  try {
    let [translation] = await googleAPI.translate(text, translateObj);
    if (config.log) {
      console.log(`word to be translated ===> ${text}`);
      console.log(`translated word ===> ${translation}`);
    }
    return translation;
  } catch (error) {
    console.log(`Error ===> ${error}`);
    return 0;
  }
}

async function listAvailableLanguages() {
  // Lists available translation language with their names in English (the default).
  const [languages] = await googleAPI.getLanguages();
  if (config.log) {
    languages.forEach((language) => console.log(language));
  }
  return languages;
}

/*
{
    input: "path/to/your.strings",
    output: "path/to/code/localizable.strings"
    from: "en",
    to: ["ko", "fr"]
}
*/
const generateLocalizableStrings = async (options) => {
  validate();

  const { input, output, from, to } = options;

  const lineInterface = readLine.createInterface({
    input: fs.createReadStream(input),
    output: process.stdout,
    console: false,
  });

  let originalText = "";
  for await (const line of lineInterface) {
    originalText += `${line}\n`;
  }
  const json = {};

  for (let i = 0; i < to.length; i++) {
    let text = "";
    const lineArray = originalText.split("\n");
    json[to[i]] = [];
    for (let j = 0; j < lineArray.length - 1; j++) {
      const stirngArr = lineArray[j].split("=");
      const key = stirngArr[0];
      const value = stirngArr[1].replace(/"/g, "").replace(/;/g, "");
      // console.log(`key-${key}:value-${value}`)
      const traslatedText = await translate(value, {
        from: from,
        to: to[i],
      });
      const refinedText = traslatedText
        .replace(/[&\/\\#,+()$~%.'":*?<>{}]«»“”/g, "")
        .trim();
      text += `${key}="${refinedText}";\n`;
      json[to[i]].push({ key: key, value: traslatedText });
    }
    const dir = `${output}/${to[i]}`;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(`${dir}/localizable.strings`, text);
  }

  return json;
};

module.exports = {
  configure,
  translate,
  listAvailableLanguages,
  generateLocalizableStrings,
};
