import JiraClient from 'jira-connector';


class Jira {
    constructor(host, username, password) {
        this.isError          = false;
        this.jira             = new JiraClient({ host, basic_auth: { username, password } });
        this.getMyself        = this.getMyself.bind(this);
        this.getIssue         = this.getIssue.bind(this);
        this.getAllIssueTypes = this.getAllIssueTypes.bind(this);
        this.getAllPriorities = this.getAllPriorities.bind(this);
        this.getAllProjects   = this.getAllProjects.bind(this);
        this.copyIssue        = this.copyIssue.bind(this);
        this.copyLogs         = this.copyLogs.bind(this);
    }

    getMyself() {
        return this.jira.myself.getMyself({}).then(data => {
            this.myself = data;
            return data;
        }).catch(error => {
            if (error) {
                console.error(`\u001B[31m getMyself: ${error}\u001B[0m`);

                this.isError = true;
                return error;
            }
        });
    }

    getIssue(issueKey) {
        return this.jira.issue.getIssue({ issueKey });
    }

    getAllIssueTypes() {
        return this.jira.issueType.getAllIssueTypes({});
    }

    getAllPriorities() {
        return this.jira.priority.getAllPriorities({});
    }

    getAllProjects() {
        return this.jira.project.getAllProjects({});
    }

    copyIssue(issue, project) {
        return Promise.all([
            this.getMyself(),
            this.getAllIssueTypes()
        ]).then(([ myself, types ]) => this.jira.issue.createIssue({
                fields: {
                    project     : { id: project.id },
                    summary     : `${issue.key} - ${issue.fields.summary}`,
                    description : `${issue.self.substring(0, issue.self.indexOf('/rest'))}/browse/${issue.key}`,
                    issuetype   : { id: types.find(t => t.name.indexOf(issue.fields.issuetype.name) !== -1).id },
                    assignee    : { name: myself.key },
                    priority    : { id: issue.fields.priority.id },
                    labels      : issue.fields.labels,
                    timetracking: {
                        originalEstimate : issue.fields.timetracking.originalEstimate,
                        remainingEstimate: issue.fields.timetracking.remainingEstimate
                    },
                    versions    : issue.fields.versions
                }
            }).then(newIssue => this.copyLogs(issue, newIssue).then(() => newIssue))
        );
    }

    copyLogs(issueFrom, issueTo) {
        let chain = Promise.resolve();

        issueFrom.fields.worklog.worklogs
            .forEach(({ comment, started, timeSpentSeconds }) => {
                chain = chain.then(() => this.jira.issue.addWorkLog({
                    issueKey: issueTo.key,
                    worklog : { comment, started, timeSpentSeconds }
                }));
            });

        return chain;
    }
}

export default Jira;