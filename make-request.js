const { publishToSns } = require("./lib/sns");
const { getAndValidateParameters } = require("./lib/make-request/options");
const { testUrl } = require("./lib/make-request/test-url");

module.exports.makeRequest = async (event, context, callback) => {
    let options;

    try {
        options = getAndValidateParameters(event, context);
    } catch (error) {
        console.log(JSON.stringify(event, null, 4));
        console.log(JSON.stringify(context, null, 4));

        return callback(error);
    }

    const {
        homeRegion,
        region,
        snsTopicArn,
    } = options;

    const result = await testUrl(options);

    try {
        await publishToSns(snsTopicArn, "site-monitor-result", result, region !== homeRegion ? homeRegion : undefined);
    } catch (err) {
        return callback(err);
    }

    return callback();
};
