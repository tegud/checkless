const AWS = require("aws-sdk"); // eslint-disable-line import/no-extraneous-dependencies
const { parseContext } = require("./lib/context");

function sendSnsEvent(topicArn, subject, message) {
    return new Promise((resolve, reject) => {
        const sns = new AWS.SNS();

        sns.publish({
            Message: JSON.stringify(message),
            Subject: subject,
            TopicArn: topicArn,
        }, (err) => {
            if (err) {
                reject(new Error(`Failed to send SNS ${err}`));
            }

            resolve();
        });
    });
}

module.exports.handleRequest = (event, context, callback) => {
    const result = JSON.parse(event.Records[0].Sns.Message);
    const snsFailureTopic = process.env.failedSnsTopic;
    const snsCompleteTopic = process.env.completeSnsTopic;

    const { accountId, region } = parseContext(context);

    const snsFailureTopicArn = `arn:aws:sns:${region}:${accountId}:${snsFailureTopic}`;
    const snsCompleteTopicArn = `arn:aws:sns:${region}:${accountId}:${snsCompleteTopic}`;

    const topicsToSendTo = [
        snsCompleteTopicArn,
        ...(result.success ? [] : [snsFailureTopicArn]),
    ];

    console.log(`Handling request for ${result.url}, success: ${result.success}, sendingToTopics: ${topicsToSendTo.join(", ")}`);

    sendSnsEvent(snsCompleteTopicArn, `SITE RESULT: ${result.url}`, result)
        .then(() => {
            if (result.success) {
                console.log("Site monitor ok, nothing to do");
                return new Promise(resolve => resolve());
            }

            console.log("Site monitor fail, sending to failure SNS");
            return sendSnsEvent(snsFailureTopicArn, `SITE FAIL: ${result.url}`, result.errorMessage || result);
        })
        .then(() => callback())
        .catch(callback);
};
