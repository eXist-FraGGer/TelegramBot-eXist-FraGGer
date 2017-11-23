import TelegramBot from 'node-telegram-bot-api';

import IPiFy from './modules/ipify';
import BotService from './modules/botService';
import JiraBotController from './JiraBotController';

const token = '481770600:AAFIlzdIKBDEIrLJlC1cSog7o32vugbbkbE';

const bot = new TelegramBot(token, { polling: true });

const botService        = new BotService({ bot });
const jiraBotController = new JiraBotController({ botService });


bot.onText(/\/start(?:@eXistFraGGerBot)?$/, (msg) => {
    bot.sendMessage(msg.chat.id, `Welcome ${msg.from.first_name} ${msg.from.last_name}`);
});

bot.on('callback_query', (msg) => {
    console.info(`callback_query: ${JSON.stringify(msg)}`);
    const chatId = msg.message.chat.id;

    botService.sendMessage(chatId, '');

    if (/^cl:(\w+)$/.test(msg.data)) {
        const [ , _id ] = /^cl:(\w+)$/.exec(msg.data),
              cmdData   = commands.get(msg.from.id);

        if (!cmdData) {
            return bot.sendMessage(chatId, 'Bad command!');
        }

        return Promise.resolve(
            DB.instans.collection('connections').find({ user_id: msg.from.id })
                .toArray((err, result) => {
                    if (err) {
                        console.error(`\u001B[db collection 'connections' find error!\u001B[0m`);

                        bot.sendMessage(chatId, '*error:* _DB error_', { parse_mode: 'Markdown' });
                    } else {
                        commands.set(msg.from.id, Object.assign({}, cmdData, { conFrom: _id }));
                        bot.sendMessage(chatId, `Choose connections TO:`, {
                            reply_markup: {
                                inline_keyboard: result.map(item => ([ {
                                    text         : `${item.name}(${item.host})`,
                                    callback_data: `clt:${item._id}`
                                } ]))
                            }
                        });
                    }
                })
        );
    }
    if (/^clt:(\w+)$/.test(msg.data)) {
        const [ , _idTo ] = /^clt:(\w+)$/.exec(msg.data),
              cmdData     = commands.get(msg.from.id);

        if (!cmdData) {
            return bot.sendMessage(chatId, 'Bad command!');
        }

        console.info('callback_query /copy to', JSON.stringify(cmdData), _idTo);

        return Promise.all([ DB.getConnectionById(cmdData.conFrom), DB.getConnectionById(_idTo) ])
            .then(([ conFrom, conTo ]) => {
                let jiraFrom = new Jira(conFrom.host, conFrom.username, conFrom.password);
                let jiraTo   = new Jira(conTo.host, conTo.username, conTo.password);
                return Promise.all([
                    jiraFrom.getIssue(cmdData.issueFromKey),
                    jiraTo.getIssue(cmdData.issueToKey)
                ]).then(([ issueFrom, issueTo ]) => jiraTo.copyLogs(issueFrom, issueTo)
                    .then(() => {
                        bot.sendMessage(chatId, 'The work logs was successfully copied: 👍');
                        jiraFrom = null;
                        jiraTo   = null;
                        commands.delete(msg.from.id);
                    })
                );
            }).catch(error => bot.sendMessage(msg.message.chat.id, `*error: * _${error}_`, { parse_mode: 'Markdown' }));
    }

    if (/^(\w+):(.+)$/.test(msg.data)) {
        const [ , _id, issueKey ] = /^(\w+):(.+)$/.exec(msg.data);
        return DB.getConnectionById(_id).then(connection => {
            let jira = new Jira(connection.host, connection.username, connection.password);
            return jira.getIssue(issueKey).then(issue => {
                bot.sendMessage(msg.message.chat.id, issue.fields.summary);
                jira = null;
            }).catch(error => bot.sendMessage(msg.message.chat.id, `*error: * _${error}_`, { parse_mode: 'Markdown' }));
        });
    } else if (msg.data === 'IP') {
        return IPiFy.getIp().then(ip => bot.sendMessage(msg.message.chat.id, ip));
    } else {
        bot.answerCallbackQuery({
            callback_query_id: msg.id,
            text             : 'OK',
            show_alert       : false
        });
    }
});

bot.onText(/\/ip(?:@eXistFraGGerBot)?$/, (msg) => {
    const chatId = msg.chat.id;

    return IPiFy.getIp().then(ip => bot.sendMessage(chatId, ip));
});

bot.onText(/\/jira(?:@eXistFraGGerBot)? (.+)/, (msg, match) => {
    const chatId = msg.chat.id,
          issue  = match[ 1 ];

    return Promise.resolve(
        DB.instans.collection('connections').find({ user_id: msg.from.id })
            .toArray((err, result) => {
                if (err) {
                    console.error(`\u001B[db collection 'connections' find error!\u001B[0m`);

                    bot.sendMessage(chatId, '*error:* _DB error_', { parse_mode: 'Markdown' });
                } else {
                    bot.sendMessage(chatId, `Choose connections:`, {
                        reply_markup: {
                            inline_keyboard: result.map(item => ([ {
                                text         : `${item.name}(${item.host})`,
                                callback_data: `${item._id}:${issue}`
                            } ]))
                        }
                    });
                }
            })
    );
});

bot.onText(/\/jira_connect(?:@eXistFraGGerBot)? (.+) (.+) (.+) (.+)/, (msg, match) => {
    const chatId   = msg.chat.id,
          name     = match[ 1 ],
          host     = match[ 2 ],
          username = match[ 3 ],
          password = match[ 4 ],
          jira     = new Jira(host, username, password);

    return jira.getMyself().then(myself => {
        DB.instans.collection('connections').insert({
            user_id: msg.from.id, name, host, username, password
        }, (err, result) => {
            if (err) {
                console.error(`\u001B[db collection 'connections' insert error!\u001B[0m`);

                bot.sendMessage(chatId, '*error:* _DB error_', { parse_mode: 'Markdown' });
            } else {
                bot.sendMessage(chatId, `Connection added!\n${myself.displayName}(${myself.emailAddress})`);
                bot.sendPhoto(chatId, myself.avatarUrls[ '48x48' ]);
            }
        });
    }).catch(err => bot.sendMessage(chatId, '*error:* _Invalid credentials_', { parse_mode: 'Markdown' }));
});

bot.onText(/\/jira_connections(?:@eXistFraGGerBot)?$/, (msg, match) => {
    const chatId = msg.chat.id;

    return Promise.resolve(
        DB.instans.collection('connections').find({ user_id: msg.from.id })
            .toArray((err, result) => {
                if (err) {
                    console.error(`\u001B[db collection 'connections' find error!\u001B[0m`);

                    bot.sendMessage(chatId, '*error:* _DB error_', { parse_mode: 'Markdown' });
                } else {
                    bot.sendMessage(chatId, `Your connections:`, {
                        reply_markup: {
                            inline_keyboard: result.map(item => ([ {
                                text         : `${item.name}(${item.host})`,
                                callback_data: item._id
                            } ]))
                        }
                    });
                }
            })
    );
});

bot.onText(/\/jira_copy_task(?:@eXistFraGGerBot)? (.+)/, (msg, match) => {
    const issueKey = match[ 1 ];

    return jiraBotController.copyJiraTaskSelectConnectionFrom({ msg, issueKey });
});

bot.onText(/\/jira_copy_logs(?:@eXistFraGGerBot)? (.+) (.+)/, (msg, match) => {
    const chatId       = msg.chat.id,
          issueFromKey = match[ 1 ],
          issueToKey   = match[ 2 ];

    return Promise.resolve(
        DB.instans.collection('connections').find({ user_id: msg.from.id })
            .toArray((err, result) => {
                if (err) {
                    console.error(`\u001B[db collection 'connections' find error!\u001B[0m`);

                    bot.sendMessage(chatId, '*error:* _DB error_', { parse_mode: 'Markdown' });
                } else {
                    commands.set(msg.from.id, { issueFromKey, issueToKey });
                    bot.sendMessage(chatId, `Choose connections FROM:`, {
                        reply_markup: {
                            inline_keyboard: result.map(item => ([ {
                                text         : `${item.name}(${item.host})`,
                                callback_data: `cl:${item._id}`
                            } ]))
                        }
                    });
                }
            })
    );
});

bot.on('message', (msg) => {
    console.info('Received your message: ' + JSON.stringify(msg));
    const fromId      = msg.from.id,
          chatId      = msg.chat.id,
          commandData = jiraBotController.getCommandData(fromId),
          cmdFunction = jiraBotController.getFunctionByCommand(commandData.cmd);
    console.info(commandData.cmd);

    return cmdFunction ? cmdFunction({ msg, commandData }) : bot.sendMessage(chatId, 'Bad command!');
});
