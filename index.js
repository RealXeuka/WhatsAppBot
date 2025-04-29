const { default:
  generateWAMessageFromContent,
  useMultiFileAuthState,
  makeInMemoryStore,
  DisconnectReason,
  relayMessage,
  makeWASocket,
  jidDecode,
  Browsers,
  proto
} = require("@whiskeysockets/baileys");

const { Boom } = require("@hapi/boom");

const readline = require("readline");
const pino = require("pino");
const path = require("path");
const os = require("os");
const fs = require("fs");

const interFace = { input: process.stdin, output: process.stdout };
const rl = readline.createInterface(interFace);
const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

let phoneNumber = '0';
const pairingCode = !!phoneNumber || process.argv.includes('--pairing-code');
const useMobile = process.argv.includes('--mobile');

const store = makeInMemoryStore({
  logger: pino().child({ 
    level: 'silent', 
    stream: 'store'
  })
});

async function connectToWhatsApp() {
  //console.log("Connecting to WhatsApp!");
  const { state, saveCreds } = await useMultiFileAuthState("./database/Session");
  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    markOnlineOnConnect: true,
    emitOwnEvents: true,
    auth: state
  });

if (!sock.authState.creds.registered) {
  let phoneNumber = await question("Your Number: ");
  phoneNumber = phoneNumber.replace(/[^0-9]/g, "");
  let code = await sock.requestPairingCode(phoneNumber, "AAAAAAAA");
  code = code?.match(/.{1,4}/g)?.join("-") || code;
  console.log(`Linked Device Code: ${code}`);
}

store.bind(sock.ev);
sock.ev.on('messages.upsert', async chatUpdate => {
  message = chatUpdate.messages[0];
  if (!message.message) return;
  message.message = (Object.keys(message.message)[0] === 'ephemeralMessage') ? message.message.ephemeralMessage.message : message.message;
  if (message.key && message.key.remoteJid === 'status@broadcast') return;
  if (message.key.id.startsWith('BAE5')) return;
  let M = proto.WebMessageInfo;
  m = M.fromObject(message);
  require("./main.js")(sock, m, chatUpdate, store);
});

sock.decodeJid = (jid) => {
  if (!jid) return jid;
  if (/:\d+@/gi.test(jid)) {
    let decode = jidDecode(jid) || {};
    return ( decode.user && decode.server ? `${decode.user}@${decode.server}`: jid );
  } else {
    return jid;
  }
}

sock.public = true;
sock.ev.on("connection.update", async (update) => {
  const { connection, lastDisconnect } = update;
  if (connection === "close") {
    let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
    switch (reason) {
    //==================================================================\\
      case DisconnectReason.badSession: {
        console.log("Bad Session Reconnect your Bot!");
        fs.rmSync("./database/Session", { recursive: true, force: true });
        connectToWhatsApp();
      }
      break;
      //==================================================================\\
      case DisconnectReason.connectionClosed: {
        console.log("Reconnecting...");
        connectToWhatsApp();
      }
      break;
      //==================================================================\\
      case DisconnectReason.connectionLost: {
        console.log("Reconnecting...");
        connectToWhatsApp();
      }
      break;
      //==================================================================\\
      case DisconnectReason.connectionReplaced: {
        console.log("Connection Replaced Reconnect your Bot!");
        fs.rmSync("./database/Session", { recursive: true, force: true });
        connectToWhatsApp();
      }
      break;
      //==================================================================\\
      case DisconnectReason.loggedOut: {
        console.log("Logged Out Reconnect your Bot!");
        fs.rmSync("./database/Session", { recursive: true, force: true });
        connectToWhatsApp();
      }
      break;
      //==================================================================\\
      case DisconnectReason.restartRequired: {
        console.log("Reconnecting...");
        connectToWhatsApp();
      }
      break;
      //==================================================================\\
      case DisconnectReason.timedOut: {
        console.log("Connection Timeout...");
        connectToWhatsApp();
      }
      break;
      //==================================================================\\
      default:
        console.log(`Disconnect Reason: ${reason} | ${connection}`);
        connectToWhatsApp();
    }
  } else if (connection === "open") {
    //console.log("Connection Open");
  } else if (connection === "connecting") {
    //console.log("Connection Connecting");
  }
});

sock.ev.on('creds.update', saveCreds);
return sock;

}

connectToWhatsApp();