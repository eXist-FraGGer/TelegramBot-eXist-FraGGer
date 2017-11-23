import _ from 'lodash';


class BotService {
    constructor({ bot }) {
        this.bot              = bot;
        this.chooseConnection = this.chooseConnection.bind(this);
        this.chooseProject    = this.chooseProject.bind(this);
        this.sendMessage      = this.sendMessage.bind(this);
    }

    chooseConnection(chatId, connections, text) {
        return Promise.resolve(
            this.bot.sendMessage(chatId, text, {
                reply_markup: {
                    one_time_keyboard: true,
                    keyboard         : _.chunk(connections.map(item => ({
                        text: `${item.name}(${item.host})`
                    })), 2)
                }
            })
        );
    }

    chooseProject(chatId, projects, text) {
        return Promise.resolve(
            this.bot.sendMessage(chatId, text, {
                reply_markup: {
                    one_time_keyboard: true,
                    keyboard         : _.chunk(projects.map(item => ({ text: item.name })), 3)
                }
            })
        );
    }

    sendMessage(chatId, text, opt) {
        return this.bot.sendMessage(chatId, text, opt);
    }
}

export default BotService;