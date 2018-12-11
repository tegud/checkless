const AWS = require("aws-sdk"); // eslint-disable-line import/no-extraneous-dependencies
const moment = require("moment");

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

const storeResultToDynamo = async (item) => {
    const dynamodb = new AWS.DynamoDB.DocumentClient({ region: "" });

    return dynamodb.put({
        TableName: `${process.env.service || "checkless"}_lastResult`,
        Item: item,
    }).promise();
};

const buildDynamoRecord = ({ success }) => ({
    success,
    lastStateChange: moment().format(),
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

    if (process.env.storeResult) {
        await storeResultToDynamo(buildDynamoRecord(result));
    }

    return callback();
};
