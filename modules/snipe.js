const { InteractionCommandBuilder, MessageCommandBuilder } = require('../scripts/builders');
const { SafeMessage, SafeInteract } = require('../scripts/safeActions');
const { MessageEmbed } = require('discord.js');
const MakeConfig = require('../scripts/makeConfig');
const Yml = require('yaml');
const ms = require('ms');

class Snipe {
    constructor() {
        this.versions = ['1.6.0','1.6.1'];
        this.snipes = [];
        this.config = this.getConfig();
    }

    onStart(Client) {
        this.commands = [
            new MessageCommandBuilder()
                .setName('snipe')
                .setDescription('View the last message deleted in the channel')
                .setExecute(async (args, message) => {
                    let snipe = this.snipes.find(s => s.channel.id === message.channel.id);
                    if (!snipe) return SafeMessage.reply(message, 'There are no snipes in this channel');

                    let embed = new MessageEmbed()
                        .setAuthor({ name: 'Boi got sniped' })
                        .setDescription(snipe.message.content)
                        .setTimestamp(snipe.time)
                        .setFooter({ text: `Sniped from ${snipe.message.author.tag}`, iconURL: snipe.message.author.displayAvatarURL() });

                    if (snipe.message.attachments.size > 0) embed.addField(snipe.message.attachments.size > 1 ? 'Attachments' : 'Attachment', `Message includes **${snipe.message.attachments.size}** ${snipe.message.attachments.size > 1 ? 'attachments' : 'attachment'}`, false);
                    await SafeMessage.reply(message, {
                        content: ' ',
                        embeds: [embed]
                    });

                    this.removeSnipe(snipe.message);
                }),
                new InteractionCommandBuilder()
                    .setCommand(SlashCommandBuilder => SlashCommandBuilder
                        .setName('snipe')
                        .setDescription('View the last message deleted in the channel')    
                    )
                    .setExecute(async (interaction) => {
                        let snipe = this.snipes.find(s => s.channel.id === interaction.channel.id);
                        if (!snipe) return SafeInteract.reply(interaction, 'There are no snipes in this channel');

                        let embed = new MessageEmbed()
                            .setAuthor({ name: 'Boi got sniped' })
                            .setDescription(snipe.message.content)
                            .setTimestamp(snipe.time)
                            .setFooter({ text: `Sniped from ${snipe.message.author.tag}`, iconURL: snipe.message.author.displayAvatarURL() });

                        if (snipe.message.attachments.size > 0) embed.addField(snipe.message.attachments.size > 1 ? 'Attachments' : 'Attachment', `Message includes **${snipe.message.attachments.size}** ${snipe.message.attachments.size > 1 ? 'attachments' : 'attachment'}`, false);
                        await SafeInteract.reply(interaction, {
                            content: ' ',
                            embeds: [embed]
                        });

                        this.removeSnipe(snipe.message);
                    })
        ];

        Client.on('messageDelete', (message) => {
            if (message.author.bot || message.author.system || !message.guild) return;
            this.addSnipe(message);
        });

        if (this.config.snipeClear.enabled) {
            setInterval(() => {
                this.clearSnipes();
            }, ms(this.config.snipeClear.interval));
        }

        return !!this.commands;
    }

    clearSnipes() {
        this.snipes = [];
    }

    addSnipe(message) {
        this.snipes.push({
            message: message,
            time: new Date(),
            channel: message.channel
        });

        this.limitSnipes();
    }

    removeSnipe(message) {
        this.snipes = this.snipes.filter(s => s.message.id !== message.id);
        this.reverseSnipes();
    }

    limitSnipes() {
        this.snipes = this.snipes.slice(0, this.config.snipeMessageLimit);
        this.reverseSnipes();
    }

    reverseSnipes() {
        this.snipes = this.snipes.reverse();
    }

    getConfig() {
        return Yml.parse(MakeConfig('./config/snipe/config.yml', {
            snipeMessageLimit: 100,
            snipeClear: {
                enabled: true,
                interval: '5h'
            }
        }));
    }
}

module.exports = new Snipe();