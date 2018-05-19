module.exports = {
    parseContext: (context) => {
        const [arn, aws, lambda, region, accountId, fn, functionName] = context.invokedFunctionArn.split(":"); // eslint-disable-line no-unused-vars

        return {
            region,
            accountId,
            functionName,
        };
    },
};
