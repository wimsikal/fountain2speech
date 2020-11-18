// Load environment variables from .env file.
require('dotenv').config()
const fs = require('fs');
const util = require('util');

// Import the jouvence library to parse fountain
const jouvence = require('jouvence');
const parser = jouvence.parser();

// Import the Google Cloud client library
const textToSpeech = require('@google-cloud/text-to-speech');
const client = new textToSpeech.TextToSpeechClient();

// Read casting file
let rawcast = fs.readFileSync('cast.json');
let cast = JSON.parse(rawcast);


// Read fountain screenplay
const fountainFile = 'screenplay.fountain' // process.argv[2];
const input = jouvence.input().fromFile(fountainFile);

let dialogs = [];
let charCounters = {};
let curCharacter;
let dialogIndex = 0;

// parser notifcations for jouvence
let parserNotification = {
    startOfDocument: function () {
        // console.log("startOfDocument");
    },
    titlePage: function (metaInformation) {
        // console.log("titlePage:", metaInformation);
    },
    sceneHeading: function (sceneHeading, extra) {
        // console.log("sceneHeading:<" + sceneHeading + ">", extra);
    },
    action: function (action, blocks, options) {
        // console.log("action:<" + action + "> options:", options);
    },
    pageBreak: function () {
        // console.log("pageBreak");
    },
    dualDialogueStart: function () {
        // console.log("dualDialogueStart");
    },
    dualDialogueEnd: function () {
        // console.log("dualDialogueEnd");
    },
    dialogueStart: function () {
        // console.log("dialogueStart");
    },
    dialogueEnd: function () {
        // console.log("dialogueEnd");
    },
    character: function (character, option) {
        curCharacter = character;
        if (option.extension) {
            // console.log("character:<" + character + "> option:", option);
        }
        else {
            // console.log("character:<" + character + ">");
        }
    },
    parenthetical: function (parenthetical) {
        // console.log("parenthetical:<" + parenthetical + ">");
    },
    dialogue: function (dialogue) {
        // console.log("dialogue:<" + dialogue + ">");
        dialogs.push({ character: curCharacter, dialog: dialogue });
    },
    transition: function (transition) {
        // console.log("transition:<" + transition + ">");
    },
    section: function (section, level, extra) {
        // console.log("section:" + level + "<" + section + ">", extra);
    },
    synopsis: function (synopsis) {
        // console.log("synopsis:<" + synopsis + ">");
    },
    block: function (blocks) {
        // console.log("block:<" + blocks + ">");
    },
    endOfDocument: function () {
        // console.log("endOfDocument");
    }
};

jouvence.dummyNotification();
parser.parse(input, parserNotification)
    .then(function () {
        // fs.writeFileSync('screenplay.json', JSON.stringify(dialogs));
        console.log("Parse done");
        getSpeeches();
    })
    .catch(function (err) {
        console.log("Error:", err);
        process.exit(1);
    });

async function getSpeeches() {

    let dialogObj = dialogs[dialogIndex];
    let char = dialogObj['character'];
    let dialog = dialogObj['dialog'];
    let voice = cast[char].voice;


    let counter = charCounters[char];
    if (isNaN(counter)) {
        counter = 0;
    } else {
        counter++;
    }
    charCounters[char] = counter;


    // Construct the request
    const request = {
        input: { text: dialog },
        voice: voice,
        audioConfig: { audioEncoding: 'MP3' },
    };

    // Performs the text-to-speech request
    const [response] = await client.synthesizeSpeech(request);
    // Write the binary audio content to a local file
    const writeFile = util.promisify(fs.writeFile);
    await writeFile('results/' + char.toLowerCase() + '_1_' + (counter + 1) + '.mp3', response.audioContent, 'binary');
    console.log('Audio content written to file: output.mp3');

    dialogIndex++;
    if (dialogs.length === dialogIndex) {
        console.log("All done");
        process.exit(1);
    } else {
        setTimeout(() => {
            getSpeeches();
        }, 200);
    }
}
