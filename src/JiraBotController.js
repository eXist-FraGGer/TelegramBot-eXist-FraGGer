import Jira from './modules/jira';
import DB from './modules/db';


class JiraBotController {
    constructor({ botService }) {
        this.commands                         = new Map();
        this.botService                       = botService;
        this.commandsLinks                    = {
            'copyJiraTask:SelectConnectionTo': this.copyJiraTaskSelectConnectionTo.bind(this),
            'copyJiraTask:SelectProject'     : this.copyJiraTaskSelectProject.bind(this),
            'copyJiraTask:Finish'            : this.copyJiraTaskFinish.bind(this)
        };
        this.copyJiraTaskSelectConnectionTo   = this.copyJiraTaskSelectConnectionTo.bind(this);
        this.copyJiraTaskSelectConnectionFrom = this.copyJiraTaskSelectConnectionFrom.bind(this);
        this.copyJiraTaskSelectProject        = this.copyJiraTaskSelectProject.bind(this);
    }

    copyJiraTaskSelectConnectionTo({ msg, commandData }) {
        const chatId = msg.chat.id,
              fromId = msg.from.id;

        if (!commandData) {
            return this.botService.sendMessage(chatId, 'Bad command!');
        }

        const { connections } = commandData,
              conFrom         = connections.find(con => msg.text === `${con.name}(${con.host})`);

        return this.botService.chooseConnection(chatId, connections, 'Choose connections TO:')
            .then(() => this.commands.set(fromId,
                Object.assign({}, commandData, {
                    conFrom,
                    cmd: 'copyJiraTask:SelectProject'
                })));
    }

    copyJiraTaskSelectConnectionFrom({ msg, issueKey }) {
        const chatId = msg.chat.id,
              fromId = msg.from.id;

        return DB.getConnectionsByUse(fromId)
            .then(connections => this.botService
                .chooseConnection(chatId, connections, 'Choose connections FROM:')
                .then(() => this.commands.set(fromId, {
                    connections, issueKey,
                    cmd: 'copyJiraTask:SelectConnectionTo'
                })));
    }

    copyJiraTaskFinish({ msg, commandData }) {
        const chatId = msg.chat.id,
              fromId = msg.from.id;

        if (!commandData) {
            return this.botService.sendMessage(chatId, 'Bad command!');
        }

        const { conFrom, conTo, projects, issueKey } = commandData;

        const projectTo = projects.find(project => msg.text === project.name);

        let jiraFrom = new Jira(conFrom.host, conFrom.username, conFrom.password);
        let jiraTo   = new Jira(conTo.host, conTo.username, conTo.password);

        return jiraFrom.getIssue(issueKey)
            .then(issue => jiraTo.copyIssue(issue, projectTo)
                .then(newIssue => {
                    this.commands.delete(fromId);
                    jiraFrom = null;
                    jiraTo   = null;
                    return Promise.resolve(
                        this.botService.sendMessage(chatId, 'The issue was successfully copied:' +
                            `👍 [${newIssue.key}](https://${conTo.host}/browse/${newIssue.key})`, {
                            parse_mode: 'Markdown'
                        })
                    );
                })
            ).catch(error =>
                this.botService.sendMessage(chatId, `*error: * _${error}_`, { parse_mode: 'Markdown' })
            );
    }

    copyJiraTaskSelectProject({ msg, commandData }) {
        const chatId = msg.chat.id,
              fromId = msg.from.id;

        if (!commandData) {
            return this.botService.sendMessage(chatId, 'Bad command!');
        }

        const { connections } = commandData,
              conTo           = connections.find(con => msg.text === `${con.name}(${con.host})`);

        let jiraTo = new Jira(conTo.host, conTo.username, conTo.password);

        return jiraTo.getAllProjects()
            .then(projects => this.botService
                .chooseProject(chatId, projects, 'Choose project TO:')
                .then(() => {
                    this.commands.set(fromId, Object.assign({}, commandData, {
                        projects, conTo,
                        cmd: 'copyJiraTask:Finish'
                    }));
                    jiraTo = null;
                })
            );
    }

    getCommandData(fromId) {
        return this.commands.get(fromId) || {};
    }

    getFunctionByCommand(cmd) {
        return this.commandsLinks[ cmd ];
    }
}

export default JiraBotController;