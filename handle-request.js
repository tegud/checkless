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

const dynamoTableName = () => `${process.env.service || "checkless"}_lastResult`;

const storeResultToDynamo = async (item) => {
    const dynamodb = new AWS.DynamoDB.DocumentClient({ region: "" });

    return dynamodb.put({
        TableName: dynamoTableName(),
        Item: item,
    }).promise();
};

const getLastResultFromDynamo = async () => {
    const dynamodb = new AWS.DynamoDB.DocumentClient({ region: "eu-west-1" });

    const record = await dynamodb.get({
        TableName: dynamoTableName(),
        Key: "ABC",
    }).promise();

    return record.Item;
};

const getStateHistoryValues = (success, previousResult) => {
    if (!previousResult || previousResult.success !== success) {
        return {
            lastStateChange: moment().format(),
            checksInState: 1,
        };
    }

    const { lastStateChange, checksInState } = previousResult;

    return {
        lastStateChange,
        checksInState: checksInState + 1,
    };
};

const buildDynamoRecord = ({ success, name, region }, previousResult) => ({
    key: `${name}_${region}`,
    success,
    ...getStateHistoryValues(success, previousResult),
});

module.exports.handleRequest = async (event, context, callback) => {
    const result = JSON.parse(event.Records[0].Sns.Message);
    const previousResult = process.env.storeResult
        ? await getLastResultFromDynamo(result)
        : undefined;

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
        await storeResultToDynamo(buildDynamoRecord(result, previousResult));
    }

    return callback();
};
