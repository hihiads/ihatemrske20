const express = require('express');
const discord = require('discord.js');
const { token, prefix, ServerID } = require('./config.json');

const app = express();
const client = new discord.Client();

app.get('/', (req, res) => {
  res.send('Pozdrav Express aplikacija!');
});

app.listen(3000, () => {
  console.log('Poslužitelj pokrenut');
});

client.on('ready', () => {
  console.log('Bot je spreman');
  client.user.setActivity('Pošalji DM poruku ako trebaš pomoć!');
});

client.on('message', async (message) => {
  if (message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (message.guild) {
    if (command === 'setup') {
      if (!message.member.hasPermission('ADMINISTRATOR')) {
        return message.channel.send('Trebate administratorske dozvole za postavljanje ModMail sustava!');
      }

      if (!message.guild.me.hasPermission('ADMINISTRATOR')) {
        return message.channel.send('Bot treba administratorske dozvole za postavljanje ModMail sustava!');
      }

      let role = message.guild.roles.cache.find(x => x.name === 'ModMail_Moderator');
      let everyone = message.guild.roles.cache.find(x => x.name === '@everyone');

      if (!role) {
        role = await message.guild.roles.create({
          name: 'ModMail_Moderator',
          color: 'GREEN',
          reason: 'Uloga potrebna za ModMail sustav',
        });
      }

      await message.guild.channels.create('MODMAIL', {
        type: 'category',
        permissionOverwrites: [
          {
            id: role.id,
            allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
          },
          {
            id: everyone.id,
            deny: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
          },
        ],
      });

      return message.channel.send('Postavljanje je završeno :D');
    } else if (command === 'close') {
      const category = message.guild.channels.cache.find(x => x.name === 'MODMAIL');
      if (message.channel.parentID !== category.id) return;

      const user = message.guild.members.cache.get(message.channel.name);
      if (!user) {
        return message.channel.send('Nemoguće je zatvoriti kanal. Naziv kanala možda je promijenjen.');
      }

      const reason = args.join(' ') || 'Nema navedenog razloga';
      await message.channel.delete();

      const embed = new discord.MessageEmbed()
        .setAuthor('Pošta je zatvorena', client.user.displayAvatarURL())
        .setColor('RED')
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter(`Poštu je zatvorio ${message.author.username}`)
        .setDescription(reason);

      // Send the embed to the user
      user.send(embed);

      // Send a notification to the specified channel when a ticket is closed
      const notificationChannel = client.channels.cache.get('1287453608333283489');
      if (notificationChannel) {
        notificationChannel.send(`Ticket closed by ${message.author.username} for user ${user.user.username}: ${reason}`);
      }
    } else if (command === 'open') {
      const category = message.guild.channels.cache.find(x => x.name === 'MODMAIL');
      if (!category) {
        return message.channel.send(`ModMail sustav nije postavljen na ovom poslužitelju. Koristite ${prefix}setup`);
      }

      if (!message.member.roles.cache.find(x => x.name === 'ModMail_Moderator')) {
        return message.channel.send('Trebate ulogu `ModMail_Moderator` za korištenje ove naredbe.');
      }

      if (isNaN(args[0]) || !args.length) {
        return message.channel.send('Molimo unesite ID osobe.');
      }

      const target = message.guild.members.cache.find(x => x.id === args[0]);
      if (!target) {
        return message.channel.send('Nemoguće je pronaći ovu osobu.');
      }

      const channel = await message.guild.channels.create(target.id, {
        type: 'text',
        parent: category.id,
      });

      let nembed = new discord.MessageEmbed()
        .setAuthor('Detalji', target.user.displayAvatarURL({ dynamic: true }))
        .setColor('BLUE')
        .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
        .setDescription(message.content)
        .addField('Ime', target.user.username)
        .addField('Datum kreiranja računa', target.user.createdAt)
        .addField('Direktan kontakt', 'Da (znači da je ovu poštu otvorio `ModMail_Moderator`)');

      channel.send(nembed);

      let uembed = new discord.MessageEmbed()
        .setAuthor('IZRAVNA POŠTA OTVORENA')
        .setColor('GREEN')
        .setThumbnail(client.user.displayAvatarURL())
        .setDescription(`Kontaktirao vas je \`ModMail_Moderator\` s poslužitelja **${message.guild.name}**. Molimo čekajte dok vam ne pošalje novu poruku!`);

      target.send(uembed);

      let newEmbed = new discord.MessageEmbed()
        .setDescription(`Otvorena pošta: <#${channel.id}>`)
        .setColor('GREEN');

      message.channel.send(newEmbed);

      // Send a notification to the specified channel when a ticket is opened
      const notificationChannel = client.channels.cache.get('1287453608333283489');
      if (notificationChannel) {
        notificationChannel.send(`Ticket opened for user ${target.user.username} by ${message.author.username}`);
      }
    } else if (command === 'help') {
      let embed = new discord.MessageEmbed()
        .setAuthor('ModMail BOT', client.user.displayAvatarURL())
        .setColor('GREEN')
        .setDescription('Ovaj bot je napravio Mark :D')
        .addField(`${prefix}setup`, 'Postavi ModMail (ne možete koristiti za više poslužitelja)', true)
        .addField(`${prefix}open`, 'Omogućuje vam otvaranje pošte za kontaktiranje bilo koga s njegovim ID-em', true)
        .addField(`${prefix}close`, 'Zatvara poštu u kojoj koristite ovu naredbu.', true)
        .setThumbnail(client.user.displayAvatarURL());

      return message.channel.send(embed);
    }
  }

  if (message.channel.parentID) {
    const category = message.guild.channels.cache.find(x => x.name === 'MODMAIL');
    if (!category) return;

    if (message.channel.parentID === category.id) {
      const member = message.guild.members.cache.get(message.channel.name);
      if (!member) return message.channel.send('Nemoguće je poslati poruku');

      let lembed = new discord.MessageEmbed()
        .setColor('GREEN')
        .setFooter(message.author.username, message.author.displayAvatarURL({ dynamic: true }))
        .setDescription(message.content);

      return member.send(lembed);
    }
  }

  if (!message.guild) {
    const guild = await client.guilds.cache.get(ServerID) || await client.guilds.fetch(ServerID).catch(() => {});
    if (!guild) return;

    const category = guild.channels.cache.find(x => x.name === 'MODMAIL');
    if (!category) return;

    const main = guild.channels.cache.find(x => x.name === message.author.id);
    if (!main) {
      let mx = await guild.channels.create(message.author.id, {
        type: 'text',
        parent: category.id,
      });

      let sembed = new discord.MessageEmbed()
        .setAuthor('POČETAK KONVERZACIJE')
        .setColor('GREEN')
        .setThumbnail(client.user.displayAvatarURL())
        .setDescription('Konverzacija je sada započeta, bit ćete kontaktirani od strane `ModMail_Moderator` uskoro :D');

      message.author.send(sembed);

      let eembed = new discord.MessageEmbed()
        .setAuthor('DETALJI', message.author.displayAvatarURL({ dynamic: true }))
        .setColor('BLUE')
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setDescription(message.content)
        .addField('Ime', message.author.username)
        .addField('Datum kreiranja računa', message.author.createdAt)
        .addField('Direktan kontakt', 'Ne (znači da je ovu poštu otvorila osoba, a ne `ModMail_Moderator`)');

      return mx.send(`<@&882730774065987614> **Ne gubite vrijeme, odgovorite što prije**`, eembed);
    }

    let xembed = new discord.MessageEmbed()
      .setColor('YELLOW')
      .setFooter(message.author.tag, message.author.displayAvatarURL({ dynamic: true }))
      .setDescription(message.content);

    main.send(xembed);
  }
});

// Log in to Discord with your client's token


client.login(process.env.token)
