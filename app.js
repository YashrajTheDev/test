const { Client, CommandInteraction, ApplicationCommandOptionType, EmbedBuilder, PermissionsBitField, AttachmentBuilder } = require('discord.js');
const { Rcon } = require('rcon-client');
const fs = require('fs');
const path = require('path');

const rankDetails = {
    'vip': { cash: 5000, claimBlocks: 200 },
    'mvp': { cash: 8000, claimBlocks: 500 },
    'mvp++': { cash: 12000, claimBlocks: 800 },
    'immortal': { cash: 15000, claimBlocks: 1200 },
};

module.exports = {
    name: 'ranklogs',
    description: 'Add rank logs to the server',
    options: [
        {
            name: 'player',
            description: 'The name of the player',
            type: ApplicationCommandOptionType.String,
            required: true,
        },
        {
            name: 'rank',
            description: 'The rank to give',
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                { name: 'VIP', value: 'vip' },
                { name: 'MVP', value: 'mvp' },
                { name: 'MVP++', value: 'mvp++' },
                { name: 'Immortal', value: 'immortal' }
            ]
        }
    ],

    /**
     * @param {Client} client 
     * @param {CommandInteraction} interaction 
     */
    run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000) // Set your desired color for error
                .setTitle('Permission Denied')
                .setDescription('You do not have permission to use this command.')
                .setTimestamp()
                .setFooter({ text: 'Minecraft Rank Management System' });
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const playerName = interaction.options.getString('player');
        const rankName = interaction.options.getString('rank');
        const rankInfo = rankDetails[rankName];

        const currentDate = new Date();
        const expirationDate = new Date();
        expirationDate.setMonth(currentDate.getMonth() + 1);

        const formatDate = (date) => date.toISOString().split('T')[0];

        const invoiceHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
                    .invoice-box { padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); }
                    .invoice-title { font-size: 24px; margin-bottom: 10px; }
                    .invoice-details { margin-top: 20px; }
                    .invoice-details table { width: 100%; border-collapse: collapse; }
                    .invoice-details table, .invoice-details th, .invoice-details td { border: 1px solid #ddd; padding: 8px; }
                    .invoice-details th { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                <div class="invoice-box">
                    <div class="invoice-title">Invoice</div>
                    <div class="invoice-details">
                        <table>
                            <tr>
                                <th>Player</th>
                                <td>${playerName}</td>
                            </tr>
                            <tr>
                                <th>Rank</th>
                                <td>${rankName}</td>
                            </tr>
                            <tr>
                                <th>Cash</th>
                                <td>${rankInfo.cash}</td>
                            </tr>
                            <tr>
                                <th>Claim Blocks</th>
                                <td>${rankInfo.claimBlocks}</td>
                            </tr>
                            <tr>
                                <th>Assigned Date</th>
                                <td>${formatDate(currentDate)}</td>
                            </tr>
                            <tr>
                                <th>Expiration Date</th>
                                <td>${formatDate(expirationDate)}</td>
                            </tr>
                        </table>
                    </div>
                </div>
            </body>
            </html>
        `;

        const rcon = new Rcon({
            host: 'your.minecraft.server.ip',
            port: 25575, // default RCON port, adjust if necessary
            password: 'your_rcon_password'
        });

        try {
            await rcon.connect();

            await rcon.send(`/lp user ${playerName} parent set ${rankName}`);
            await rcon.send(`/eco give ${playerName} ${rankInfo.cash}`);
            await rcon.send(`/acb ${playerName} ${rankInfo.claimBlocks}`);

            await rcon.end();

            const logChannel = client.channels.cache.get('your-discord-log-channel-id');

            // Create HTML file
            const invoiceFileName = `${playerName}invoice.html`;
            const invoiceFilePath = path.join(__dirname, invoiceFileName);
            fs.writeFileSync(invoiceFilePath, invoiceHTML);

            const attachment = new AttachmentBuilder(invoiceFilePath);

            const logEmbed = new EmbedBuilder()
                .setColor(0x00FF00) // Set your desired color
                .setTitle('Rank Log')
                .addFields(
                    { name: 'Player', value: playerName, inline: true },
                    { name: 'Rank', value: rankName, inline: true },
                    { name: 'Cash', value: rankInfo.cash.toString(), inline: true },
                    { name: 'Claim Blocks', value: rankInfo.claimBlocks.toString(), inline: true },
                    { name: 'Assigned Date', value: formatDate(currentDate), inline: true },
                    { name: 'Expiration Date', value: formatDate(expirationDate), inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Minecraft Rank Management System' });

            await logChannel.send({ embeds: [logEmbed], files: [attachment] });

            const replyEmbed = new EmbedBuilder()
                .setColor(0x00FF00) // Set your desired color
                .setTitle('Rank Assigned')
                .setDescription(`Successfully assigned ${rankName} to ${playerName}. The log has been sent to the logs channel.`)
                .setTimestamp()
                .setFooter({ text: 'Minecraft Rank Management System' });

            interaction.reply({ embeds: [replyEmbed], files: [attachment], ephemeral: true });

            // Clean up the file after sending
            fs.unlinkSync(invoiceFilePath);
        } catch (error) {
            console.error(error);
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000) // Set your desired color for error
                .setTitle('Error')
                .setDescription('An error occurred while processing the command.')
                .setTimestamp()
                .setFooter({ text: 'Minecraft Rank Management System' });
            interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
