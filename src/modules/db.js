import { MongoClient, ObjectId } from 'mongodb';

const DBConfig = 'mongodb://-eXist-FraGGer:-eXist-FraGGer@ds261745.mlab.com:61745/jira_telegram';


class DB {
    constructor(config) {
        MongoClient.connect(config, (err, database) => {
            if (err) {
                console.error('\u001B[31mDatabase connection error!\u001B[0m');
            } else {
                this.instans = database;
                console.info('\u001B[32mDatabase connection successfully!\u001B[0m');
            }
        });
    }

    getConnectionById(_id) {
        return new Promise((resolve, reject) => {
            this.instans.collection('connections').findOne({ _id: ObjectId(_id) }, (err, item) => {
                if (err) {
                    console.error(`\u001B[db collection 'connections' find error!\u001B[0m`);

                    return reject(err);
                } else {
                    return resolve(item);
                }
            });
        });
    }

    getConnectionsByUse(user_id) {
        return new Promise((resolve, reject) => {
            this.instans.collection('connections').find({ user_id }).toArray((err, connections) => {
                if (err) {
                    console.error(`\u001B[db collection 'connections' find error!\u001B[0m`);

                    return reject(err);
                } else {
                    return resolve(connections);
                }
            });
        });
    }
}

export default new DB(DBConfig);