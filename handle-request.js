const { parseContext } = require("./lib/context");
const { publishToSns } = require("./lib/sns");

const buildTopicArns = ({ accountId, region }, { snsFailureTopic, snsCompleteTopic }) => ({
    snsFailureTopicArn: `arn:aws:sns:${region}:${accountId}:${snsFailureTopic}`,
    snsCompleteTopicArn: `arn:aws:sns:${region}:${accountId}:${snsCompleteTopic}`,
});

module.exports.handleRequest = async (event, context, callback) => {
    const result = JSON.parse(event.Records[0].Sns.Message);

    const {
        snsFailureTopicArn,
        snsCompleteTopicArn,
    } = buildTopicArns(parseContext(context), process.env);

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
