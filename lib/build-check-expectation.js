module.exports = {
    buildExpectationFromEvent: ({ statusCode }) => {
        console.log(typeof statusCode);

        if (typeof statusCode === "number") {
            return { statusCode };
        }

        if (typeof statusCode === "string") {
            return { statusCodeRegex: statusCode };
        }

        return { statusCode: 200 };
    },
};
