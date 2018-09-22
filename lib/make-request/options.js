const { parseContext } = require("../context");

const getOptionsFromSnsOrHttp = (event) => {
    if (event.Records && event.Records.length && event.Records[0] && event.Records[0].EventSource === "aws:sns") {
        return JSON.parse(event.Records[0].Sns.Message);
    }

    return event;
};

const getAllOptions = (event, context) => {
    const requestOptions = getOptionsFromSnsOrHttp(event);

    const {
        url,
        followRedirect,
        ...otherOptions
    } = requestOptions;
    const {
        handleRequestTopic,
        homeRegion,
    } = process.env;

    const { timeout = 3000 } = event;
    const { accountId, region } = parseContext(context);

    const snsTopicArn = `arn:aws:sns:${homeRegion || region}:${accountId}:${handleRequestTopic}`;

    return {
        url,
        followRedirect,
        otherOptions,
        handleRequestTopic,
        homeRegion,
        timeout,
        accountId,
        region,
        snsTopicArn,
    };
};

const validateRequiredParameters = (parameters) => {
    const requiredParameters = ["region", "handleRequestTopic", "accountId", "url"];

    const missingRequiredParameters = requiredParameters.reduce((missing, current) => {
        if (parameters[current]) {
            return missing;
        }

        return [...missing, current];
    }, []);

    if (missingRequiredParameters.length) {
        throw new Error(`${missingRequiredParameters.join(", ")} not set`);
    }
};

module.exports = {
    getAndValidateParameters: (event, context) => {
        const options = getAllOptions(event, context);

        validateRequiredParameters(options);

        return options;
    },
};
