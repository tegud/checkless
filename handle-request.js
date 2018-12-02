const { parseContext } = require("./lib/context");
const { publishToSns } = require("./lib/sns");

const buildTopicArns = ({
    accountId,
    region,
}, {
    completeSnsTopic,
    failedSnsTopic,
}) => ({
    snsFailureTopicArn: `arn:aws:sns:${region}:${accountId}:${failedSnsTopic}`,
    snsCompleteTopicArn: `arn:aws:sns:${region}:${accountId}:${completeSnsTopic}`,
});

module.exports.handleRequest = async (event, context, callback) => {
    const result = JSON.parse(event.Records[0].Sns.Message);

    const {
        snsFailureTopicArn,
        snsCompleteTopicArn,
    } = buildTopicArns(parseContext(context), process.env);

    const topicsToSendTo = [
        {
            topicArn: snsCompleteTopicArn,
            title: `SITE RESULT: ${result.url}`,
            message: result,
        },
        ...(result.success ? [] : [
            {
                topicArn: snsFailureTopicArn,
                title: `SITE FAIL: ${result.url}`,
                message: result.errorMessage || result,
            },
        ]),
    ];

    console.log(`Handling request for ${result.url} (${result.location}), success: ${result.success}, sendingToTopics: ${topicsToSendTo.map(({ topicArn }) => topicArn).join(", ")}`);

    try {
        await Promise.all(topicsToSendTo.map(({
            topicArn,
            title,
            message,
        }) => publishToSns(topicArn, title, message)));
    } catch (error) {
        console.error(`Error sending SNS: ${error.message}`);
    }

    return callback();
};
