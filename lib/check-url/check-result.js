module.exports = {
    checkResult: (expect, result) => {
        console.log("Checking result against expected", {
            actual: { statusCode: result.statusCode },
            expected: expect,
        });

        if (expect.statusCode && expect.statusCode.includes) {
            return expect.statusCode.includes(result.statusCode);
        }

        if (expect.statusCode) {
            return result.statusCode === expect.statusCode;
        }

        return new RegExp(expect.statusCodeRegex)
            .exec(result.statusCode) ? true : false; // eslint-disable-line no-unneeded-ternary
    },
};
