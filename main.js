const {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  downloadMediaMessage,
  getTypeMessage,
  proto
} = require("@whiskeysockets/baileys");
//==================================================================\\
const moment = require('moment-timezone');
const pino = require('pino');
const path = require('path');
const os = require("os");
const fs = require('fs');
//==================================================================\\
module.exports = async (sock, m, chatUpdate, store) => {
  m.id = m.key.id;
  m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16;
  m.chat = m.key.remoteJid;
  m.fromMe = m.key.fromMe;
  m.isGroup = m.chat.endsWith('@g.us');
  m.sender = sock.decodeJid(m.fromMe && sock.user.id || m.participant || m.key.participant || m.chat || '');
  if (m.isGroup) m.participant = sock.decodeJid(m.key.participant) || '';
  function getTypeM(message) {
    const type = Object.keys(message);
    var restype =  (!['senderKeyDistributionMessage', 'messageContextInfo'].includes(type[0]) && type[0]) || (type.length >= 3 && type[1] !== 'messageContextInfo' && type[1]) || type[type.length - 1] || Object.keys(message)[0];
	return restype;
  };
  m.mtype = getTypeM(m.message);
  m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getTypeM(m.message[m.mtype].message)] : m.message[m.mtype]);
  m.text = m.msg?.text 
      || m.msg?.caption 
      || m.message?.conversation 
      || m.msg?.contentText 
      || m.msg?.selectedDisplayText 
      || m.msg?.title 
      || '';
  const info = m;
  const from = message.key.remoteJid;
  var body = 
    (m.mtype === 'interactiveResponseMessage') ? JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id:
    (m.mtype === 'conversation') ? m.message.conversation :
    (m.mtype === 'deviceSentMessage') ? m.message.extendedTextMessage.text :
    (m.mtype == 'imageMessage') ? m.message.imageMessage.caption :
    (m.mtype == 'videoMessage') ? m.message.videoMessage.caption : 
    (m.mtype == 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
    (m.mtype == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : 
    (m.mtype == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : 
    (m.mtype == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : 
    (m.mtype == 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text) : "";
  const getGroupAdmins = (participants) => {
    let admins = [];
    for (let i of participants) {
      i.admin === "superadmin" ? admins.push(i.id) :  i.admin === "admin" ? admins.push(i.id) : '';
    };
    return admins || [];
  }
//==================================================================\\
const sleep = async (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}
//==================================================================\\
const snowi = sock;
const rocket = sock;
const conn = sock;
//==================================================================\\
var budy = (typeof m.text == 'string' ? m.text: '');
const bardy = body || '';
prefix = ['','.']
var prefix = prefix 
  ? /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi.test(bardy) 
  ? bardy.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi)[0] : "" : prefix ?? global.prefix;
const isCmd = bardy.startsWith(prefix);
const command = bardy.replace(prefix, '').trim().split(/ +/).shift().toLowerCase();
const quoted = m.quoted ? m.quoted : m;
const groupMetadata = m.isGroup ? await sock.groupMetadata(from).catch(e => {}) : '';
const participants = m.isGroup ? await groupMetadata.participants : '';
const botNumber = await sock.decodeJid(sock.user.id);
//==================================================================\\
const device = '' + (info.key.id.length > 21 ? 'Android' : info.key.id.substring(0, 2) == '3A' ? 'Ios': 'Web ore Api ore Bot');
const groupAdmins = m.isGroup ? await getGroupAdmins(participants) : '';
const isBotAdmins = m.isGroup ? groupAdmins.includes(botNumber) : false;
const isAdmins = m.isGroup ? groupAdmins.includes(m.sender) : false;
const groupName = m.isGroup ? groupMetadata?.subject : '';
const date = moment.tz("Europe/Berlin").format("DD/MM/YY");
const time = moment.tz("Europe/Berlin").format("HH:mm:ss");
const mime = (quoted.msg || quoted).mimetype || '';
const args = bardy.trim().split(/ +/).slice(1);
const isBot = info.key.fromMe ? true : false;
const username = m.pushName || "No Name";
const content = JSON.stringify(m.message);
const isGroup = from.endsWith('@g.us');
const sJid = "status@broadcast";
const text = args.join(" ");
const q = args.join(" ");
//==================================================================\\
sock.sendjson = (jidss, jsontxt = {}, outrasconfig = {}) => {
  const allmsg = generateWAMessageFromContent(jidss, proto.Message.fromObject(jsontxt), outrasconfig); 
  return sock.relayMessage(jidss, allmsg.message, { messageId: allmsg.key.sender });
}
//==================================================================\\
m.mtypeMessage = body.substr(0, 50).replace(/\n/g, "");
//==================================================================\\
if (global.autoread) {
  sock.readMessages([info.key]);
}
//==================================================================\\
if (global.autoTyping) {
  sock.sendPresenceUpdate('composing', from);
}
//==================================================================\\
if (global.autoRecording) {
  sock.sendPresenceUpdate('recording', from);
}
//==================================================================\\
const settingsPath = './database/lib/settings.js';
const settings = require(settingsPath);
global.savemsg = settings.savemsg;
global.msglog1 = settings.msglog1;
//==================================================================\\
function updateSettings(settingKey, value) {
  const settings = require(settingsPath);
  settings[settingKey] = value;
  fs.writeFileSync(settingsPath, `module.exports = ${JSON.stringify(settings, null, 2)};`, 'utf8');
  global[settingKey] = value;
}
//==================================================================\\
if (global.savemsg) {
  if (m.message) {
    const path = './database/Session/msg.js';
    const date = new Date().toISOString(); 
    fs.writeFile(path, date, { flag: 'a+' }, (err) => {
      if (err) {
        console.error('Eror:', err);
      }
    })
  }
}
//==================================================================\\
if (global.msglog1) {
  const timestamp = new Date();
    if (isCmd && isGroup) {
      console.log(`Group Chat: ${groupName} | Device: ${device} | Time: ${time}\nJid: ${from} | Message: ${body.length > 500 ? '' : body}`);
    } else {
      console.log(`Private Chat: ${from} | Device: ${device} | Time: ${time}\nJid: ${from} | Message: ${body.length > 500 ? '' : body}`);
    }
}
//==================================================================\\
switch(command) {
//==================================================================\\
case 'test': {
  if (!isBot) return;
  sock.sendjson(from, {
    "extendedTextMessage": {
      "text":"Hi"
    }
  })
}
break;
//==================================================================\\
}};
//==================================================================\\
let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(`Updated ${__filename}`);
  delete require.cache[file];
  require(file);
});