const { parseContext } = require("./lib/context");
const { publishToSns } = require("./lib/sns");

module.exports.handleRequest = async (event, context, callback) => {
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

    console.log(`Handling request for ${result.url} (${result.location}), success: ${result.success}, sendingToTopics: ${topicsToSendTo.join(", ")}`);

    try {
        const snsSenders = [publishToSns(snsCompleteTopicArn, `SITE RESULT: ${result.url}`, result)];

        if (!result.success) {
            snsSenders.push(publishToSns(snsFailureTopicArn, `SITE FAIL: ${result.url}`, result.errorMessage || result));
        }

        await Promise.all(snsSenders);
    } catch (error) {
        console.error(`Error sending SNS: ${error.message}`);
    }

    return callback();
};
