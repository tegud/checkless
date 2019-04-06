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

const buildKey = (name, region) => `${name}_${region}`;

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

const storeResultToDynamo = async (homeRegion, item) => {
    const dynamodb = new AWS.DynamoDB.DocumentClient({ region: homeRegion });

    return dynamodb.put({
        TableName: dynamoTableName(),
        Item: item,
    }).promise();
};

const getLastResultFromDynamo = async (homeRegion, { name, region }) => {
    const dynamodb = new AWS.DynamoDB.DocumentClient({ region: homeRegion });

    const record = await dynamodb.get({
        TableName: dynamoTableName(),
        Key: buildKey(name, region),
    }).promise();

    return record.Item;
};

module.exports.handleRequest = async (event, context, callback) => {
    const result = JSON.parse(event.Records[0].Sns.Message);
    const parsedContext = parseContext(context);
    const homeRegion = parsedContext.region;
    const previousResult = process.env.storeResult
        ? await getLastResultFromDynamo(homeRegion, result)
        : undefined;

    const {
        snsFailureTopicArn,
        snsCompleteTopicArn,
    } = buildTopicArns(parsedContext, process.env);

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
                message: result,
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
        await storeResultToDynamo(homeRegion, buildDynamoRecord(result, previousResult));
    }

    return callback();
};
