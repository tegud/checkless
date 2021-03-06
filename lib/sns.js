const AWS = require("aws-sdk"); // eslint-disable-line import/no-extraneous-dependencies

module.exports = {
    publishToSns: async (topicArn, subject, message, region) => {
        const sns = new AWS.SNS({ region });

        return new Promise((resolve, reject) => sns.publish({
            Message: JSON.stringify(message),
            Subject: subject,
            TopicArn: topicArn,
        }, (err) => {
            if (err) {
                return reject(new Error(`Failed to send SNS ${err}`));
            }

            return resolve();
        }));
    },
};
