const { publishToSns } = require("./lib/sns");
const { CheckStatusExpectationError } = require("./lib/errors");
const { checkUrl } = require("./lib/check-url");
const { parseContext } = require("./lib/context");
const { lookupLocationFromRegion } = require("./lib/region-lookup");

const buildBaseResult = (url, timeout, ttfb, region) => ({
    url,
    timeout,
    timeToFirstByte: ttfb,
    region,
    location: lookupLocationFromRegion(region),
});

function buildResult(response, url, timeout, ttfb, region) {
    const result = {
        ...buildBaseResult(url, timeout, ttfb, region),
        statusCode: response.statusCode,
        success: true,
    };

    return result;
}

const buildResultFromError = (err, url, timeout, ttfb, region) => {
    const baseErrorResponse = {
        success: false,
        ...buildBaseResult(url, timeout, ttfb, region),
    };

    if (err instanceof CheckStatusExpectationError) {
        return {
            ...baseErrorResponse,
            errorMessage: err.message,
            statusCode: err.actualStatus,
        };
    }

    const errorMessageOverrides = {
        ETIMEDOUT: `Timeout after ${timeout}ms from url: ${url}`,
        EESOCKETTIMEDOUT: `Timeout after ${timeout}ms from url: ${url}`,
        ECONNREFUSED: "Could not connect",
    };

    return {
        ...baseErrorResponse,
        errorMessage: errorMessageOverrides[err.code]
            ? errorMessageOverrides[err.code]
            : err.message || err,
    };
};

const validateRequiredParameters = (parameters) => {
    const requiredParameters = Object.keys(parameters);
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

module.exports.makeRequest = async (event, context, callback) => {
    const { url, snsTopic, homeRegion } = event;
    const timeout = event.timeout || 3000;
    const { accountId, region } = parseContext(context);

    const snsTopicArn = `arn:aws:sns:${homeRegion || region}:${accountId}:${snsTopic}`;

    try {
        validateRequiredParameters({
            region,
            snsTopic,
            accountId,
            url,
        });
    } catch (error) {
        console.log(JSON.stringify(event, null, 4));
        console.log(JSON.stringify(context, null, 4));

        return callback(error);
    }

    console.log(`Testing url: ${url} from ${region}, with timeout: ${timeout}, SNS ARN: ${snsTopicArn}`);

    let result;

    const start = new Date().valueOf();
    try {
        const checkResult = await checkUrl(url, timeout);
        const end = new Date().valueOf();

        result = buildResult(checkResult, url, timeout, end - start, region);
    } catch (err) {
        const end = new Date().valueOf();

        result = buildResultFromError(err, url, timeout, end - start, region);
    }

    try {
        await publishToSns(snsTopicArn, "site-monitor-result", result, region !== homeRegion ? homeRegion : undefined);
    } catch (err) {
        return callback(err);
    }

    return callback();
};
