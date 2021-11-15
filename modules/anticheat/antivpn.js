const Util = require('fallout-utility');
const Proxy = require('proxycheck-node.js'); 
const SafeMessage = require('../../scripts/safeMessage');
const MessageCommandBuilder = require('../../scripts/messageCommandBuilder');

const log = new Util.Logger('AntiVPN');

let cache = {};
let antivpn = null;
let enabled = null;

module.exports.commands = [
    new MessageCommandBuilder()
        .setName('antivpn')
        .setDescription('Anti VPN')
        .addArgument('action', true, 'Action to perform', ['toggle', 'clearcache'])
        .setExecute(async (args, message, Client) => {
            if(args.length < 1) return;

            if(args[0] == 'toggle') {
                await SafeMessage.send(message.channel, `AntiVPN status was set to: ${(enabled ? 'Sleep' : 'Active')}`);

                enabled = !enabled;
            } else if(args[0] == 'clearcache') {
                await SafeMessage.send(message.channel, 'AntiVPN cache was cleared');

                cache = {};
            }
        })
];
module.exports.start = (Client, config) => {
    enabled = config.antiVPN.enabled;
    antivpn = new Proxy({ api_key: config.antiVPN.APIKey });

    Client.on('messageCreate', async (message) => {
        if(!enabled) return;
        const players = getDetails(message.content);
        if(!players || !Object.keys(players).length || message.author.id !== config.serverBotId || message.channelId !== config.consoleChannelId) return;

        for(const player in players) {
            if(await usingVPN(player)) {
                log.log(`${player} (${players[player]}) is using VPN`);
                await punish(player, players[player]);
            } else {
                log.log(`${player} (${players[player]}) is not using VPN`);
            }
        }
    });

    async function punish(ip, name) {
        const consoleChannel = await Client.channels.cache.get(config.consoleChannelId);
        if(!consoleChannel) return;

        for(let message of config.mmessages.proxyDetectedMessage) {
            message = Util.replaceAll(message, '%name%', name);
            message = Util.replaceAll(message, '%ip%', ip);

            await consoleChannel.send(message);
        }
    }
}

function getDetails(input) {
    input = input.replace(/\\(\*|_|`|~|\\)/g, '$1');
    return parseOutput(input);
}

async function usingVPN(ip) {
    if(typeof cache[ip] !== 'undefined') {
        log.log(`VPN cache for ${ip} is available`);
        return cache[ip].vpn ? true : false;
    }

    log.log(`VPN cache for ${ip} is not available`);
    const check = await antivpn.check(ip, { vpn: true });
    let result = check.status === 'ok' && check[ip]?.proxy === 'yes' ? true : false;
        result = check.status !== 'ok' ? result : false;
        
    cache[ip] = { vpn: result };

    return result;
}

function unique(arr) {
    var result = [];
    for(const item of (typeof arr === 'string' ? [arr] : arr)) {
        if (result.indexOf(item) == -1) {
            result.push(item);
        }
    }

    return result;
}

function getName(input) {
    input = input.replace(/\\(\*|_|`|~|\\)/g, '$1');

    return input.replace(/\[[^\]]*\]/g, '') != '' ? input.replace(/\[[^\]]*\]/g, '') : null;
}

function removePort(input) {
    return input.split(':')[0] ? input.split(':')[0] : input;
}

function getBracketsStrings(input) {
    const regex = /\[\/\b(?:(?:2(?:[0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9])\.){3}(?:(?:2([0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9]))\b:[0-9]+\]/gm;
    const matches = input.match(regex) ? input.match(regex) : '';
    let match = typeof matches == 'object' ? matches.shift() : matches;
        match =  Util.replaceAll(match, '[', '');
        match =  Util.replaceAll(match, ']', '');
        match =  Util.replaceAll(match, '/', '');

    return match != '' ? match : null;
}

function parseOutput(input) {
    const regex = /[a-zA-Z0-9_]+\[\/\b(?:(?:2(?:[0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9])\.){3}(?:(?:2([0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9]))\b:[0-9]+\]/gmi;

    let output = {};
    let players = [];
        players = input.match(regex) ? input.match(regex) : players;
        players = unique(players);

    for (const value of players) {
        let ip = removePort(getBracketsStrings(value));
        let name = getName(value);

        if(ip && name) output[ip] = name;
    }

    return output;
}